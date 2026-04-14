"""
Ratings Router — Movie rating and feedback.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# In-memory ratings store
_ratings: list[dict] = []


class RatingRequest(BaseModel):
    movie_id: int
    rating: int  # 1-5


class NotInterestedRequest(BaseModel):
    movie_id: int


@router.post("/")
async def rate_movie(request: RatingRequest):
    """Submit a movie rating (1-5 stars)."""
    if not 1 <= request.rating <= 5:
        return {"error": "Rating must be between 1 and 5"}
    
    _ratings.append({
        "movie_id": request.movie_id,
        "rating": request.rating,
    })
    return {"status": "saved", "movie_id": request.movie_id, "rating": request.rating}


@router.post("/not-interested")
async def not_interested(request: NotInterestedRequest):
    """Mark a movie as not interested."""
    _ratings.append({
        "movie_id": request.movie_id,
        "rating": -1,  # Sentinel for "not interested"
    })
    return {"status": "saved", "movie_id": request.movie_id}


@router.get("/history")
async def get_rating_history():
    """Get user's rating history."""
    return {"ratings": _ratings}
