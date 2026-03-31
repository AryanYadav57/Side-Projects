from collections import deque
from fastapi import APIRouter, HTTPException

from models.schemas import (
    QueryRequest, QueryResponse,
    GraphResponse, Node, Edge,
    ExplainResponse,
    PathRequest, PathResponse, PathStep,
)
from services.wikipedia_service import fetch_wikipedia_content
from services.text_cleaner import clean_text
from nlp.entity_extractor import extract_entities
from nlp.relationship_builder import build_relationships
from nlp.entity_deduplicator import deduplicate_entities, apply_dedup_to_edges
from nlp.entity_ranker import rank_entities

router = APIRouter()

# ── Simple in-memory cache ────────────────────────────────────
# Keyed by normalised topic string. Lives for the process lifetime.
# Use a TTL-aware cache (e.g. cachetools) in production.
_graph_cache: dict = {}


@router.post("/query", response_model=QueryResponse, summary="Fetch cleaned Wikipedia text")
def query_topic(request: QueryRequest):
    """
    Accepts a topic string, fetches its Wikipedia page,
    cleans the text, and returns it.
    """
    try:
        data = fetch_wikipedia_content(request.topic, deep_search=request.deep_search)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    cleaned = clean_text(data["text"])
    return QueryResponse(topic=data["title"], text=cleaned)


@router.post("/graph", response_model=GraphResponse, summary="Build knowledge graph for a topic")
def build_graph(request: QueryRequest):
    """
    Full Phase 2 pipeline:
      1. Check cache — return instantly if seen before
      2. Fetch Wikipedia page
      3. Clean text
      4. Extract entities with types (PERSON, ORG, GPE…)
      5. Deduplicate near-duplicate entities
      6. Build typed relationships via SVO dependency parsing + co-occurrence fallback
      7. Remap edges through dedup map
      8. Rank entities by degree + frequency
      9. Return enriched graph JSON
    """
    cache_key = request.topic.strip().lower()
    if cache_key in _graph_cache:
        return _graph_cache[cache_key]

    try:
        data = fetch_wikipedia_content(request.topic, deep_search=request.deep_search)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    cleaned = clean_text(data["text"])

    # Step 1: extract entities (returns list of {id, label, entity_type})
    raw_entities = extract_entities(cleaned)

    if not raw_entities:
        raise HTTPException(
            status_code=422,
            detail="No entities could be extracted from this topic's Wikipedia page."
        )

    # Step 2: deduplicate (e.g. "Turing" → "Alan Turing")
    entities, dedup_map = deduplicate_entities(raw_entities, topic=data["title"])

    # Step 3: build typed relationships
    raw_edges = build_relationships(cleaned, entities)

    # Step 4: remap edges through dedup, remove self-loops & duplicates
    edges = apply_dedup_to_edges(raw_edges, dedup_map)

    # Step 5: rank entities (adds `importance` field in-place)
    entities = rank_entities(entities, edges, cleaned)

    # Step 6: build response
    nodes = [
        Node(
            id=e["id"],
            label=e["label"],
            entity_type=e.get("entity_type", "UNKNOWN"),
            importance=e.get("importance", 1.0),
        )
        for e in entities
    ]
    edge_objects = [
        Edge(source=ed["source"], target=ed["target"], relation=ed["relation"], reason=ed.get("reason"))
        for ed in edges
    ]

    result = GraphResponse(nodes=nodes, edges=edge_objects, topic=data["title"])
    _graph_cache[cache_key] = result
    return result


@router.get("/explain/{node}", response_model=ExplainResponse, summary="Explain a knowledge graph node")
def explain_node(node: str):
    """
    Returns the Wikipedia summary for a given entity/node name.
    """
    try:
        data = fetch_wikipedia_content(node)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return ExplainResponse(node=data["title"], summary=data["summary"])


@router.post("/path", response_model=PathResponse, summary="Find shortest connection path between two nodes")
def find_path(request: PathRequest):
    """
    Runs BFS on the client-supplied edge list to find the shortest path
    from `source` to `target`. Returns an ordered chain of hops, each
    with its relationship label and the source sentence that backs it up.
    """
    # Build bidirectional adjacency list and edge lookup
    adj: dict[str, list[str]] = {}
    edge_lookup: dict[tuple, dict] = {}

    for e in request.edges:
        src, tgt = e.source, e.target
        adj.setdefault(src, []).append(tgt)
        adj.setdefault(tgt, []).append(src)
        edge_data = {"relation": e.relation, "reason": e.reason}
        edge_lookup[(src, tgt)] = edge_data
        edge_lookup[(tgt, src)] = edge_data  # bidirectional

    # BFS: find shortest path
    queue: deque[list[str]] = deque([[request.source]])
    visited: set[str] = {request.source}

    while queue:
        path = queue.popleft()
        node = path[-1]

        if node == request.target:
            # Build step-by-step breakdown
            steps: list[PathStep] = []
            for i in range(len(path) - 1):
                edge_data = edge_lookup.get((path[i], path[i + 1]), {})
                steps.append(PathStep(
                    from_node=path[i],
                    to_node=path[i + 1],
                    relation=edge_data.get("relation", "CONNECTED_TO"),
                    reason=edge_data.get("reason"),
                ))
            return PathResponse(path=path, steps=steps, found=True)

        for neighbor in adj.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    # No path found
    return PathResponse(path=[], steps=[], found=False)
