import spacy
from backend.services.nlp_engine import get_nlp
from typing import List, Dict

nlp = get_nlp()
# Add custom entity ruler for niche topics
if "entity_ruler" not in nlp.pipe_names:
    ruler = nlp.add_pipe("entity_ruler", before="ner")
    patterns = [
        {"label": "ORG", "pattern": "Number (N)ine"},
        {"label": "ORG", "pattern": "Maison Margiela"},
        {"label": "ORG", "pattern": "Undercover"},
        {"label": "ORG", "pattern": "Vetements"},
        {"label": "ORG", "pattern": "Rick Owens"},
        {"label": "ORG", "pattern": "Raf Simons"},
        {"label": "ORG", "pattern": "Yohji Yamamoto"},
        {"label": "ORG", "pattern": "Comme des Garçons"},
        {"label": "PERSON", "pattern": "Nettspend"},
        {"label": "PERSON", "pattern": "Fakemink"},
        {"label": "PERSON", "pattern": "Llondonactress"},
    ]
    ruler.add_patterns(patterns)

# Entity types we extract and their friendly display names
ENTITY_TYPE_MAP = {
    "PERSON":     "Person",
    "ORG":        "Organisation",
    "GPE":        "Place",
    "LOC":        "Location",
    "NORP":       "Group / Nationality",
    "PRODUCT":    "Product",
    "WORK_OF_ART":"Work of Art",
    "EVENT":      "Event",
    "FAC":        "Facility",
    "LAW":        "Law / Policy",
}

RELEVANT_TYPES = set(ENTITY_TYPE_MAP.keys())


def extract_entities_from_doc(doc: spacy.tokens.Doc) -> List[Dict[str, str]]:
    """
    Extract named entities from a pre-processed spaCy doc.
    """
    # Count occurrences to pick the most common form
    counts: Dict[str, int] = {}
    canonical: Dict[str, str] = {}  # lowered → original casing
    types: Dict[str, str] = {}

    for ent in doc.ents:
        if ent.label_ not in RELEVANT_TYPES:
            continue
        raw = ent.text.strip()
        if len(raw) < 2:
            continue
        key = raw.lower()
        counts[key] = counts.get(key, 0) + 1
        if key not in canonical:
            canonical[key] = raw
        if key not in types:
            types[key] = ent.label_

    # Build output sorted by count descending, capped at 35 entities (faster)
    sorted_keys = sorted(counts.keys(), key=lambda k: -counts[k])[:35]

    result = []
    for key in sorted_keys:
        label = canonical[key]
        result.append({
            "id": label,
            "label": label,
            "entity_type": types.get(key, "UNKNOWN"),
        })

    return result


def extract_entities(text: str) -> List[Dict[str, str]]:
    """
    Extract named entities from text using spaCy NER.
    Returns a list of dicts: { id, label, entity_type }

    Improvements over Phase 1:
    - Returns entity type alongside each entity
    - Filters short/noisy tokens
    """
    doc = nlp(text[:25_000])
    return extract_entities_from_doc(doc)

    # Count occurrences to pick the most common form
    counts: Dict[str, int] = {}
    canonical: Dict[str, str] = {}  # lowered → original casing

    for ent in doc.ents:
        if ent.label_ not in RELEVANT_TYPES:
            continue
        raw = ent.text.strip()
        if len(raw) < 2:
            continue
        key = raw.lower()
        counts[key] = counts.get(key, 0) + 1
        if key not in canonical:
            canonical[key] = raw

    # Collect entity types (use first occurrence's label)
    types: Dict[str, str] = {}
    for ent in doc.ents:
        if ent.label_ not in RELEVANT_TYPES:
            continue
        key = ent.text.strip().lower()
        if key not in types:
            types[key] = ent.label_

    # Build output sorted by count descending, capped at 40 entities
    sorted_keys = sorted(counts.keys(), key=lambda k: -counts[k])[:40]

    result = []
    for key in sorted_keys:
        label = canonical[key]
        result.append({
            "id": label,
            "label": label,
            "entity_type": types.get(key, "UNKNOWN"),
        })

    return result
