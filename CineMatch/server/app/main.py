"""
CineMatch Backend — FastAPI Application Entry Point

Provides API endpoints for:
- Movie search and discovery (TMDB proxy)
- CineBot AI chatbot (NVIDIA NIM API)
- User management (local auth for now)
- Ratings and watchlist
- Recommendation engine
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import movies, cinebot, users, ratings, watchlist


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("[CineMatch] API starting up...")
    print(f"   TMDB API Key: {'[OK] configured' if settings.TMDB_API_KEY else '[X] missing'}")
    print(f"   NVIDIA API:   {'[OK] configured' if settings.NVIDIA_API_KEY else '[X] missing'}")
    yield
    print("[CineMatch] API shutting down...")


app = FastAPI(
    title="CineMatch API",
    description="Smart AI-Powered Movie Recommendation Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Expo dev client and web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrictable in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────
app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
app.include_router(cinebot.router, prefix="/api/cinebot", tags=["CineBot"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(ratings.router, prefix="/api/ratings", tags=["Ratings"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["Watchlist"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "cinematch-api",
        "version": "1.0.0",
    }
