from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.query import router as query_router

app = FastAPI(
    title="Internet Knowledge Mapper API",
    description=(
        "Takes any topic, fetches knowledge from Wikipedia, "
        "extracts entities and relationships, and returns a knowledge graph."
    ),
    version="1.0.0",
)

# Allow all origins in development — restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(query_router, tags=["Knowledge Graph"])


@app.get("/", summary="Health check")
def root():
    return {"status": "ok", "message": "Internet Knowledge Mapper API is running."}
