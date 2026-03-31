# mMapper System Architecture \& Data Flow

**mMapper** is designed as a pipeline that takes a simple text query, fetches unstructured data from the web, and uses Natural Language Processing (NLP) to structure it into a format that can be visualized as an interactive Knowledge Graph.

Here is a detailed breakdown of how the project works, accompanied by a visual flow diagram.

## Information Processing Pipeline

````mermaid
sequenceDiagram
    participant User
    participant Frontend (D3.js)
    participant FastAPI Backend
    participant Wiki/Web Service
    participant NLP Pipeline

    User->>Frontend (D3.js): Enters Topic Query
    Frontend (D3.js)->>FastAPI Backend: POST /graph {topic}
    
    rect rgb(20, 40, 60)
        Note right of FastAPI Backend: 1. Data Ingestion
        FastAPI Backend->>Wiki/Web Service: Fetch Content
        Wiki/Web Service-->>FastAPI Backend: Return Raw Text/Summary
    end
    
    rect rgb(40, 20, 60)
        Note right of FastAPI Backend: 2. Text Cleaning
        FastAPI Backend->>FastAPI Backend: Clean Text (Remove artifacts)
    end
    
    rect rgb(60, 40, 20)
        Note right of FastAPI Backend: 3. NLP Processing Pipeline
        FastAPI Backend->>NLP Pipeline: Cleaned Text
        NLP Pipeline->>NLP Pipeline: Entity Extraction (spaCy)
        NLP Pipeline->>NLP Pipeline: Entity Deduplication
        NLP Pipeline->>NLP Pipeline: Relationship Building (SVO)
        NLP Pipeline->>NLP Pipeline: Entity Ranking
        NLP Pipeline-->>FastAPI Backend: Graph Data (Nodes & Edges)
    end
    
    FastAPI Backend-->>Frontend (D3.js): JSON Response (GraphResponse)
    
    rect rgb(20, 60, 40)
        Note left of Frontend (D3.js): 4. Visualization
        Frontend (D3.js)->>Frontend (D3.js): Render Force-Directed Graph
    end
    
    Frontend (D3.js)-->>User: Interactive UI Display
````

## Detailed Step-by-Step Breakdown

### 1. The Frontend (User Interface)
The frontend is built using pure HTML, CSS, and Vanilla JavaScript with **D3.js** for rendering the graph.
- When you type a query and submit it, JavaScript catches the event and sends a `POST` request to the backend's `/graph` endpoint.
- Once it receives the processed data back, D3.js uses physics simulations (force-directed layout) to position the nodes (entities) and draw the edges (relationships) dynamically on your screen.

### 2. The Backend API (FastAPI)
The backend is powered by **FastAPI** (`main.py` and `routers/query.py`). It acts as the orchestrator for the entire pipeline.
- It exposes core endpoints like `/graph` (to build the entire graph map) and `/explain/{node}` (to fetch the summary of a specific node when clicked).

### 3. Data Ingestion & Cleaning (`services/`)
Before NLP can happen, the system needs raw text.
- **Wikipedia Service (`wikipedia_service.py`)**: The system looks up the topic using the Wikipedia API. If the topic exists, it pulls the page content. (As mentioned in the README, it can also fall back to DuckDuckGo/BeautifulSoup for niche topics not on Wikipedia).
- **Text Cleaner (`text_cleaner.py`)**: The raw text often contains chaotic formatting, citations, or weird spacing. The text cleaner strips these out so the NLP models don't get confused.

### 4. The NLP Pipeline (`nlp/`)
This is the "brain" of the project where unstructured text becomes structured data. It happens in five distinct phases:

1. **Entity Extraction (`entity_extractor.py`)**: 
   The cleaned text is fed into **spaCy** (using the `en_core_web_sm` model). spaCy identifies **Named Entities** in the text (e.g., classifying "Albert Einstein" as a `PERSON` and "Germany" as a `GPE`/Location). This forms raw *Nodes*.
   
2. **Entity Deduplication (`entity_deduplicator.py`)**: 
   Natural language is messy. An article might refer to "Einstein" in one paragraph and "Albert Einstein" in another. The deduplicator merges these near-duplicates so you don't end up with multiple nodes for the exact same concept.
   
3. **Relationship Building (`relationship_builder.py`)**: 
   To draw lines between the dots, the system parses the grammatical dependency trees of sentences. It looks for **Subject-Verb-Object (SVO)** patterns. If a sentence says "Microsoft acquired GitHub", the system extracts: `Microsoft [Source Node]` -> `acquired [Edge/Relation]` -> `GitHub [Target Node]`.

4. **Edge Remapping**: 
   Because entities were deduplicated in Step 2, the newly found relationships must be remapped to point to the correct, unified "master" entities.

5. **Entity Ranking (`entity_ranker.py`)**: 
   To make the visualization visually hierarchical, entities are ranked based on their importance. This is usually calculated by how many connections an entity has (degree centrality) or how frequently it appears. Important entities become larger nodes.

### 5. The Response
The backend packages the final nodes with their types and importance sizes, along with the calculated edges/relationships, into a JSON format. This JSON is handed right back to the frontend to complete the loop!
