"""
Entity importance ranker.

Scores each entity 0.0–1.0 based on:
  - Graph degree (how many edges connect to it)
  - Text frequency (how often it appears in the source text)

Combined score: 0.6 * degree_score + 0.4 * freq_score
"""
from typing import List, Dict
import math


def rank_entities(
    entities: List[Dict],
    edges: List[Dict],
    text: str
) -> List[Dict]:
    """
    Add an `importance` score to each entity dict in place.
    Returns the same list with scores filled in.
    """
    # ── Degree score ──────────────────────────────
    degree: Dict[str, int] = {e["id"]: 0 for e in entities}
    for edge in edges:
        if edge["source"] in degree:
            degree[edge["source"]] += 1
        if edge["target"] in degree:
            degree[edge["target"]] += 1

    max_degree = max(degree.values(), default=1) or 1

    # ── Frequency score ───────────────────────────
    text_lower = text.lower()
    freq: Dict[str, int] = {}
    for e in entities:
        freq[e["id"]] = text_lower.count(e["id"].lower())

    max_freq = max(freq.values(), default=1) or 1

    # ── Combine ───────────────────────────────────
    for e in entities:
        deg_score  = degree[e["id"]] / max_degree
        freq_score = freq[e["id"]]   / max_freq
        # Apply log dampening so super-connected nodes don't dwarf everything
        combined = 0.6 * deg_score + 0.4 * freq_score
        e["importance"] = round(min(combined, 1.0), 4)

    return entities
