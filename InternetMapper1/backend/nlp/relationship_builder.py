import re
import spacy
from typing import List, Dict, Optional
from backend.services.nlp_engine import get_nlp

# Use the centralized model
nlp = get_nlp()

# ── Relationship verb → canonical edge label mapping ──────────────────────
VERB_MAP = {
    "found":      "FOUNDED_BY",   "co-found": "FOUNDED_BY",
    "create":     "CREATED_BY",   "invent":   "INVENTED_BY",
    "develop":    "DEVELOPED_BY", "build":    "BUILT_BY",
    "design":     "DESIGNED_BY",  "discover": "DISCOVERED_BY",
    "establish":  "ESTABLISHED_BY",
    "work":       "WORKS_FOR",    "employ":   "EMPLOYS",
    "join":       "MEMBER_OF",    "lead":     "LED_BY",
    "head":       "LED_BY",       "direct":   "LED_BY",
    "run":        "LED_BY",       "manage":   "LED_BY",
    "acquire":    "ACQUIRED_BY",  "buy":      "ACQUIRED_BY",
    "own":        "OWNED_BY",     "purchase": "ACQUIRED_BY",
    "merge":      "MERGED_WITH",
    "locate":     "LOCATED_IN",   "base":     "LOCATED_IN",
    "headquarter":"LOCATED_IN",
    "include":    "INCLUDES",     "consist":  "INCLUDES",
    "comprise":   "INCLUDES",     "contain":  "INCLUDES",
    "part":       "PART_OF",
    "use":        "USES",         "utilize":  "USES",
    "apply":      "USES",         "employ":   "USES",
    "support":    "SUPPORTS",     "enable":   "ENABLES",
    "power":      "POWERS",
    "succeed":    "SUCCEEDED_BY", "replace":  "REPLACED_BY",
    "follow":     "FOLLOWED_BY",
    "associate":  "ASSOCIATED_WITH",
    "relate":     "RELATED_TO",
    "connect":    "CONNECTED_TO",
    "collaborate":"COLLABORATES_WITH",
    "partner":    "PARTNERS_WITH",
}

def _lemma_to_relation(lemma: str) -> str:
    return VERB_MAP.get(lemma.lower(), None)

def _extract_year(text: str) -> Optional[int]:
    years = re.findall(r'\b(1[7-9]\d{2}|20[0-2]\d)\b', text)
    return int(years[0]) if years else None

def _get_entity_match(token, entity_set: set) -> Optional[str]:
    if token.text in entity_set:
        return token.text
    chunk_tokens = sorted([token] + [child for child in token.children if child.dep_ in ("compound", "amod")], key=lambda x: x.i)
    chunk_text = " ".join([t.text for t in chunk_tokens])
    if chunk_text in entity_set:
        return chunk_text
    if len(token.text) > 2 and token.pos_ in ("PROPN", "NOUN"):
        for ent in entity_set:
            if token.text in ent.split():
                return ent
    return None

def _extract_svo_edges(doc: spacy.tokens.Doc, entity_set: set) -> List[Dict]:
    edges = []
    seen = set()
    for token in doc:
        if token.pos_ != "VERB":
            continue
        relation = _lemma_to_relation(token.lemma_)
        if not relation:
            continue
        subjects = []
        for c in token.children:
            if c.dep_ in ("nsubj", "nsubjpass"):
                match = _get_entity_match(c, entity_set)
                if match: subjects.append(match)
        objects = []
        for c in token.children:
            if c.dep_ in ("dobj", "attr", "pobj"):
                match = _get_entity_match(c, entity_set)
                if match: objects.append(match)
            elif c.dep_ == "prep":
                for gc in c.children:
                    match = _get_entity_match(gc, entity_set)
                    if match: objects.append(match)
        for subj in subjects:
            for obj in objects:
                if subj == obj:
                    continue
                pair = (subj, obj, relation)
                if pair not in seen:
                    seen.add(pair)
                    sent_text = token.sent.text.strip()
                    edges.append({
                        "source": subj, 
                        "target": obj, 
                        "relation": relation, 
                        "reason": sent_text,
                        "year": _extract_year(sent_text)
                    })
    return edges

def _extract_cooccurrence_edges(doc: spacy.tokens.Doc, entity_set: set) -> List[Dict]:
    edges = []
    seen = set()
    for sent in doc.sents:
        present = [e for e in entity_set if e in sent.text]
        for i in range(len(present)):
            for j in range(i + 1, len(present)):
                pair = (present[i], present[j])
                if pair not in seen:
                    seen.add(pair)
                    sent_text = sent.text.strip()
                    edges.append({
                        "source": present[i],
                        "target": present[j],
                        "relation": "CO_OCCURS_WITH",
                        "reason": sent_text,
                        "year": _extract_year(sent_text)
                    })
    return edges

def build_relationships_from_doc(doc: spacy.tokens.Doc, entities: List[Dict]) -> List[Dict]:
    """Build relationships from a pre-processed spaCy doc."""
    entity_set = {e["id"] for e in entities}
    svo_edges = _extract_svo_edges(doc, entity_set)
    cooc_edges = _extract_cooccurrence_edges(doc, entity_set)

    covered = {(e["source"], e["target"]) for e in svo_edges}
    covered |= {(e["target"], e["source"]) for e in svo_edges}

    fallback = [
        e for e in cooc_edges
        if (e["source"], e["target"]) not in covered
        and (e["target"], e["source"]) not in covered
    ]
    return svo_edges + fallback

def build_relationships(text: str, entities: List[Dict]) -> List[Dict]:
    """Extract relationships by processing the text into a doc first."""
    if not nlp:
        return []
    doc = nlp(text[:25_000]) # Cap at 25k for performance
    return build_relationships_from_doc(doc, entities)
