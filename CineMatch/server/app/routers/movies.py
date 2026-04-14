"""
Movies Router — TMDB proxy endpoints for movie discovery.
"""

from fastapi import APIRouter, Query
from typing import Optional
import httpx
from functools import lru_cache

from app.config import settings

router = APIRouter()

TMDB_IMG = "https://image.tmdb.org/t/p"
GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
    53: "Thriller", 10752: "War", 37: "Western",
}


async def tmdb_request(path: str, params: dict = None):
    """Make a request to TMDB API."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.TMDB_BASE_URL}{path}",
            params={"api_key": settings.TMDB_API_KEY, **(params or {})},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()


def format_movie(raw: dict) -> dict:
    """Format a TMDB movie response."""
    return {
        "id": raw["id"],
        "title": raw.get("title", ""),
        "year": int(raw.get("release_date", "0")[:4]) if raw.get("release_date") else 0,
        "overview": raw.get("overview", ""),
        "poster_url": f"{TMDB_IMG}/w342{raw['poster_path']}" if raw.get("poster_path") else None,
        "backdrop_url": f"{TMDB_IMG}/w780{raw['backdrop_path']}" if raw.get("backdrop_path") else None,
        "vote_average": raw.get("vote_average", 0),
        "vote_count": raw.get("vote_count", 0),
        "genres": [GENRE_MAP.get(gid, "Other") for gid in raw.get("genre_ids", [])],
        "language": raw.get("original_language", "en"),
    }


@router.get("/trending")
async def get_trending(page: int = 1):
    """Get trending movies this week."""
    data = await tmdb_request("/trending/movie/week", {"page": page, "region": "IN"})
    return {"results": [format_movie(m) for m in data.get("results", [])]}


@router.get("/top-rated")
async def get_top_rated(page: int = 1):
    """Get top-rated movies."""
    data = await tmdb_request("/movie/top_rated", {"page": page, "region": "IN"})
    return {"results": [format_movie(m) for m in data.get("results", [])]}


@router.get("/search")
async def search_movies(
    q: str = "",
    genres: Optional[str] = None,
    language: Optional[str] = None,
    min_rating: Optional[float] = None,
    page: int = 1,
):
    """Search movies with filters."""
    if q:
        data = await tmdb_request("/search/movie", {"query": q, "page": page, "region": "IN"})
    else:
        params = {"sort_by": "popularity.desc", "page": page, "vote_count.gte": 50}
        if genres:
            params["with_genres"] = genres
        if language:
            params["with_original_language"] = language
        if min_rating:
            params["vote_average.gte"] = min_rating
        data = await tmdb_request("/discover/movie", params)

    return {"results": [format_movie(m) for m in data.get("results", [])]}


@router.get("/mood/{mood}")
async def get_by_mood(mood: str):
    """Get 5 movies matching a mood."""
    mood_genres = {
        "laugh": "35",
        "cry": "18",
        "thrill": "53,27",
        "relax": "10751,35",
        "think": "878,9648",
    }
    genre_ids = mood_genres.get(mood, "35")
    data = await tmdb_request("/discover/movie", {
        "with_genres": genre_ids,
        "sort_by": "vote_average.desc",
        "vote_count.gte": 100,
    })
    results = [format_movie(m) for m in data.get("results", [])[:5]]
    return {"mood": mood, "results": results}


@router.get("/{movie_id}")
async def get_movie_detail(movie_id: int):
    """Get full movie details with credits and providers."""
    import asyncio
    movie, credits, providers = await asyncio.gather(
        tmdb_request(f"/movie/{movie_id}"),
        tmdb_request(f"/movie/{movie_id}/credits"),
        tmdb_request(f"/movie/{movie_id}/watch/providers"),
    )

    cast = [
        {
            "name": c["name"],
            "character": c.get("character", ""),
            "profile_url": f"{TMDB_IMG}/w185{c['profile_path']}" if c.get("profile_path") else None,
        }
        for c in credits.get("cast", [])[:10]
    ]
    director = next((c["name"] for c in credits.get("crew", []) if c.get("job") == "Director"), None)

    in_providers = providers.get("results", {}).get("IN", {}).get("flatrate", [])
    platforms = [
        {
            "name": p["provider_name"],
            "logo_url": f"{TMDB_IMG}/w92{p['logo_path']}" if p.get("logo_path") else None,
        }
        for p in in_providers
    ]

    return {
        "id": movie["id"],
        "title": movie.get("title", ""),
        "year": int(movie.get("release_date", "0")[:4]) if movie.get("release_date") else 0,
        "overview": movie.get("overview", ""),
        "poster_url": f"{TMDB_IMG}/w500{movie['poster_path']}" if movie.get("poster_path") else None,
        "backdrop_url": f"{TMDB_IMG}/w1280{movie['backdrop_path']}" if movie.get("backdrop_path") else None,
        "vote_average": movie.get("vote_average", 0),
        "vote_count": movie.get("vote_count", 0),
        "genres": [g["name"] for g in movie.get("genres", [])],
        "language": movie.get("original_language", "en"),
        "runtime": movie.get("runtime"),
        "tagline": movie.get("tagline", ""),
        "cast": cast,
        "director": director,
        "platforms": platforms,
    }
