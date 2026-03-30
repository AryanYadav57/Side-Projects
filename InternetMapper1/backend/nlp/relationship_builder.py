import re
import spacy
from typing import List, Dict

nlp = spacy.load("en_core_web_sm")

# ── Relationship verb → canonical edge label mapping ──────────────────────
VERB_MAP = {
    # Creation / founding
    "found":      "FOUNDED_BY",   "co-found": "FOUNDED_BY",
    "create":     "CREATED_BY",   "invent":   "INVENTED_BY",
    "develop":    "DEVELOPED_BY", "build":    "BUILT_BY",
    "design":     "DESIGNED_BY",  "discover": "DISCOVERED_BY",
    "establish":  "ESTABLISHED_BY",

    # Membership / affiliation
    "work":       "WORKS_FOR",    "employ":   "EMPLOYS",
    "join":       "MEMBER_OF",    "lead":     "LED_BY",
    "head":       "LED_BY",       "direct":   "LED_BY",
    "run":        "LED_BY",       "manage":   "LED_BY",

    # Acquisition / ownership
    "acquire":    "ACQUIRED_BY",  "buy":      "ACQUIRED_BY",
    "own":        "OWNED_BY",     "purchase": "ACQUIRED_BY",
    "merge":      "MERGED_WITH",

    # Location / structure
    "locate":     "LOCATED_IN",   "base":     "LOCATED_IN",
    "headquarter":"LOCATED_IN",
    "include":    "INCLUDES",     "consist":  "INCLUDES",
    "comprise":   "INCLUDES",     "contain":  "INCLUDES",
    "part":       "PART_OF",

    # Usage / dependency
    "use":        "USES",         "utilize":  "USES",
    "apply":      "USES",         "employ":   "USES",
    "support":    "SUPPORTS",     "enable":   "ENABLES",
    "power":      "POWERS",

    # Succession / role
    "succeed":    "SUCCEEDED_BY", "replace":  "REPLACED_BY",
    "follow":     "FOLLOWED_BY",

    # Generic
    "associate":  "ASSOCIATED_WITH",
    "relate":     "RELATED_TO",
    "connect":    "CONNECTED_TO",
    "collaborate":"COLLABORATES_WITH",
    "partner":    "PARTNERS_WITH",
}


def _lemma_to_relation(lemma: str) -> str:
    """Map a verb lemma to a canonical relationship label."""
    return VERB_MAP.get(lemma.lower(), None)


def _get_entity_match(token, entity_set: set) -> str:
    """
    Attempt to match a dependency token (usually the root of a noun chunk)
    to the full multi-word entity strings in entity_set.
    """
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

def _extract_svo_edges(doc, entity_set: set) -> List[Dict]:
    """
    Dependency-parse based SVO extraction.
    For each verb token, find its nsubj and dobj (or pobj via prep).
    If both subject and object are known entities → emit typed edge.
    """
    edges = []
    seen = set()

    for token in doc:
        if token.pos_ != "VERB":
            continue

        relation = _lemma_to_relation(token.lemma_)
        if not relation:
            continue

        # Find subject(s)
        subjects = []
        for c in token.children:
            if c.dep_ in ("nsubj", "nsubjpass"):
                match = _get_entity_match(c, entity_set)
                if match: subjects.append(match)
                
        # Find object(s) — direct or via preposition
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
                    edges.append({"source": subj, "target": obj, "relation": relation, "reason": token.sent.text.strip()})

    return edges


def _extract_cooccurrence_edges(doc, entity_set: set) -> List[Dict]:
    """
    Fallback: sentence-level co-occurrence for entity pairs
    that weren't captured by SVO parsing.
    Uses a generic CO_OCCURS_WITH label.
    """
    edges = []
    seen = set()

    for sent in doc.sents:
        present = [e for e in entity_set if e in sent.text]
        for i in range(len(present)):
            for j in range(i + 1, len(present)):
                pair = (present[i], present[j])
                if pair not in seen:
                    seen.add(pair)
                    edges.append({
                        "source": present[i],
                        "target": present[j],
                        "relation": "CO_OCCURS_WITH",
                        "reason": sent.text.strip()
                    })

    return edges


def build_relationships(text: str, entities: List[Dict]) -> List[Dict]:
    """
    Build typed relationship edges between entities.

    Strategy:
    1. Try SVO dependency parsing for semantic, typed edges (FOUNDED_BY, USES, etc.)
    2. Fall back to co-occurrence for any entity pairs not yet connected.
    3. Return a combined, deduplicated edge list.

    Args:
        text: cleaned Wikipedia text
        entities: list of {id, label, entity_type} dicts from entity_extractor

    Returns:
        list of {source, target, relation} dicts
    """
    entity_set = {e["id"] for e in entities}
    doc = nlp(text[:40_000])

    svo_edges = _extract_svo_edges(doc, entity_set)
    cooc_edges = _extract_cooccurrence_edges(doc, entity_set)

    # Prefer SVO edges; add co-occurrence only for pairs not already covered
    covered = {(e["source"], e["target"]) for e in svo_edges}
    covered |= {(e["target"], e["source"]) for e in svo_edges}

    fallback = [
        e for e in cooc_edges
        if (e["source"], e["target"]) not in covered
        and (e["target"], e["source"]) not in covered
    ]

    return svo_edges + fallback
