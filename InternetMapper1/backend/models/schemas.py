from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class QueryRequest(BaseModel):
    topic: str
    deep_search: bool = False  # if True, skip Wikipedia and use DuckDuckGo web search


class QueryResponse(BaseModel):
    topic: str
    text: str


class Node(BaseModel):
    id: str
    label: str
    entity_type: Optional[str] = "UNKNOWN"   # PERSON, ORG, GPE, etc.
    importance: Optional[float] = 1.0         # 0.0–1.0 score


class Edge(BaseModel):
    source: str
    target: str
    relation: str                              # CO_OCCURS_WITH, FOUNDED_BY, PART_OF…
    weight: Optional[float] = 1.0             # future: edge strength
    reason: Optional[str] = None              # the sentence explaining the connection


class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    topic: Optional[str] = None


class ExplainResponse(BaseModel):
    node: str
    summary: str


class PathRequest(BaseModel):
    source: str
    target: str
    edges: List[Edge]


class PathStep(BaseModel):
    from_node: str
    to_node: str
    relation: str
    reason: Optional[str] = None


class PathResponse(BaseModel):
    path: List[str]           # ordered list of node IDs
    steps: List[PathStep]     # each hop with its relationship details
    found: bool
