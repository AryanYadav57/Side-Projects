from fastapi import APIRouter, HTTPException

from models.schemas import (
    QueryRequest, QueryResponse,
    GraphResponse, Node, Edge,
    ExplainResponse,
)
from services.wikipedia_service import fetch_wikipedia_content
from services.text_cleaner import clean_text
from nlp.entity_extractor import extract_entities
from nlp.relationship_builder import build_relationships
from nlp.entity_deduplicator import deduplicate_entities, apply_dedup_to_edges
from nlp.entity_ranker import rank_entities

router = APIRouter()


@router.post("/query", response_model=QueryResponse, summary="Fetch cleaned Wikipedia text")
def query_topic(request: QueryRequest):
    """
    Accepts a topic string, fetches its Wikipedia page,
    cleans the text, and returns it.
    """
    try:
        data = fetch_wikipedia_content(request.topic)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    cleaned = clean_text(data["text"])
    return QueryResponse(topic=data["title"], text=cleaned)


@router.post("/graph", response_model=GraphResponse, summary="Build knowledge graph for a topic")
def build_graph(request: QueryRequest):
    """
    Full Phase 2 pipeline:
      1. Fetch Wikipedia page
      2. Clean text
      3. Extract entities with types (PERSON, ORG, GPE…)
      4. Deduplicate near-duplicate entities
      5. Build typed relationships via SVO dependency parsing + co-occurrence fallback
      6. Remap edges through dedup map
      7. Rank entities by degree + frequency
      8. Return enriched graph JSON
    """
    try:
        data = fetch_wikipedia_content(request.topic)
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

    return GraphResponse(nodes=nodes, edges=edge_objects, topic=data["title"])


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
