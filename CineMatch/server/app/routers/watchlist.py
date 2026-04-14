"""
Watchlist Router — Save and manage movies to watch later.
"""

from fastapi import APIRouter, HTTPException

router = APIRouter()

# In-memory watchlist store
_watchlist: list[int] = []


@router.get("/")
async def get_watchlist():
    """Get user's watchlist."""
    return {"watchlist": _watchlist, "count": len(_watchlist)}


@router.post("/{movie_id}")
async def add_to_watchlist(movie_id: int):
    """Add a movie to watchlist."""
    if movie_id in _watchlist:
        return {"status": "already_exists", "movie_id": movie_id}
    _watchlist.append(movie_id)
    return {"status": "added", "movie_id": movie_id, "count": len(_watchlist)}


@router.delete("/{movie_id}")
async def remove_from_watchlist(movie_id: int):
    """Remove a movie from watchlist."""
    if movie_id not in _watchlist:
        raise HTTPException(404, "Movie not in watchlist")
    _watchlist.remove(movie_id)
    return {"status": "removed", "movie_id": movie_id, "count": len(_watchlist)}
