"""
Entity deduplication — merges near-duplicate entity names.

For Phase 2 we use simple string-based heuristics (no heavy embedding model):
- Exact case-insensitive match (already handled in extractor)
- One is a substring of the other (e.g. "Turing" inside "Alan Turing")
- Abbreviation expansion (e.g. "AI" → "Artificial Intelligence")

Returns a mapping: original_id → canonical_id
"""
import re
from typing import List, Dict, Tuple


def build_dedup_map(entities: List[Dict], topic: str = "") -> Dict[str, str]:
    """
    Build a deduplication mapping {alias_id → canonical_id}.
    Canonical is the longer/fuller form.
    """
    ids = [e["id"] for e in entities]
    mapping = {i: i for i in ids}  # identity by default

    # Sort by length descending — longer names are canonical
    sorted_ids = sorted(ids, key=len, reverse=True)

    # Pre-compile pattern maps and lowercase caches to optimize O(N^2)
    short_patterns = {}
    lower_cache = {name: name.lower() for name in sorted_ids}

    for i, long_name in enumerate(sorted_ids):
        long_lower = lower_cache[long_name]
        for short_name in sorted_ids[i + 1:]:
            # Already mapped
            if mapping[short_name] != short_name:
                continue
            
            short_lower = lower_cache[short_name]
            # Fast path check
            if short_lower not in long_lower:
                continue
            
            # short is a word-boundary substring of long
            if short_name not in short_patterns:
                short_patterns[short_name] = re.compile(r'\b' + re.escape(short_name) + r'\b', re.IGNORECASE)
                
            if short_lower != long_lower and short_patterns[short_name].search(long_name):
                mapping[short_name] = long_name

    return mapping


def deduplicate_entities(entities: List[Dict], topic: str = "") -> Tuple[List[Dict], Dict[str, str]]:
    """
    Apply deduplication to entity list.
    Returns (deduplicated_list, dedup_map).
    """
    dedup_map = build_dedup_map(entities, topic)
    seen = set()
    result = []
    
    # Pre-compute an id lookup for faster next()
    entity_by_id = {e["id"]: e for e in entities}
    
    for e in entities:
        canonical = dedup_map[e["id"]]
        if canonical not in seen:
            seen.add(canonical)
            # Use canonical entity
            canonical_entity = entity_by_id.get(canonical, e)
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
