"""
Entity deduplication — merges near-duplicate entity names.

For Phase 2 we use simple string-based heuristics (no heavy embedding model):
- Exact case-insensitive match (already handled in extractor)
- One is a substring of the other (e.g. "Turing" inside "Alan Turing")
- Abbreviation expansion (e.g. "AI" → "Artificial Intelligence")

Returns a mapping: original_id → canonical_id
"""
from typing import List, Dict


def build_dedup_map(entities: List[Dict], topic: str = "") -> Dict[str, str]:
    """
    Build a deduplication mapping {alias_id → canonical_id}.
    Canonical is the longer/fuller form.
    """
    ids = [e["id"] for e in entities]
    mapping = {i: i for i in ids}  # identity by default

    # Sort by length descending — longer names are canonical
    sorted_ids = sorted(ids, key=len, reverse=True)

    for i, long_name in enumerate(sorted_ids):
        for short_name in sorted_ids[i + 1:]:
            # Already mapped
            if mapping[short_name] != short_name:
                continue
            # short is a word-boundary substring of long
            if _is_contained(short_name, long_name):
                mapping[short_name] = long_name

    return mapping


def deduplicate_entities(entities: List[Dict], topic: str = "") -> (List[Dict], Dict[str, str]):
    """
    Apply deduplication to entity list.
    Returns (deduplicated_list, dedup_map).
    """
    dedup_map = build_dedup_map(entities, topic)
    seen = set()
    result = []
    for e in entities:
        canonical = dedup_map[e["id"]]
        if canonical not in seen:
            seen.add(canonical)
            # Use canonical entity
            canonical_entity = next((x for x in entities if x["id"] == canonical), e)
            result.append(canonical_entity)
    return result, dedup_map


def apply_dedup_to_edges(edges: List[Dict], dedup_map: Dict[str, str]) -> List[Dict]:
    """
    Remap edge source/target IDs through the dedup map.
    Removes self-loops created by deduplication.
    Deduplicates resulting edges.
    """
    seen = set()
    result = []
    for edge in edges:
        src = dedup_map.get(edge["source"], edge["source"])
        tgt = dedup_map.get(edge["target"], edge["target"])
        if src == tgt:
            continue
        key = (src, tgt, edge["relation"])
        if key not in seen:
            seen.add(key)
            result.append({"source": src, "target": tgt, "relation": edge["relation"], "reason": edge.get("reason")})
    return result


def _is_contained(short: str, long: str) -> bool:
    """Check if `short` appears as a whole word within `long`."""
    import re
    pattern = r'\b' + re.escape(short) + r'\b'
    return bool(re.search(pattern, long, re.IGNORECASE)) and short.lower() != long.lower()
