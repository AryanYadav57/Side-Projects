"""
Users Router — Local auth (no Firebase) + profile management.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import hashlib
import secrets
import jwt

from app.config import settings

router = APIRouter()

# ── In-memory user store (replace with DB later) ─
_users: dict[str, dict] = {}
_tokens: dict[str, str] = {}  # token -> user_id


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PreferencesRequest(BaseModel):
    genres: list[str] = []
    languages: list[str] = []
    platforms: list[str] = []
    viewing_frequency: Optional[str] = None
    preferred_runtime: Optional[str] = None
    watching_with: Optional[str] = None


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.post("/register")
async def register(request: RegisterRequest):
    """Register a new user."""
    if request.email in _users:
        raise HTTPException(400, "Email already registered")
    
    user_id = secrets.token_hex(8)
    _users[request.email] = {
        "user_id": user_id,
        "name": request.name,
        "email": request.email,
        "password_hash": _hash_password(request.password),
        "created_at": datetime.utcnow().isoformat(),
        "preferences": {},
        "onboarded": False,
    }
    
    token = _create_token(user_id)
    return {"token": token, "user_id": user_id, "name": request.name}


@router.post("/login")
async def login(request: LoginRequest):
    """Login with email and password."""
    user = _users.get(request.email)
    if not user or user["password_hash"] != _hash_password(request.password):
        raise HTTPException(401, "Invalid email or password")
    
    token = _create_token(user["user_id"])
    return {
        "token": token,
        "user_id": user["user_id"],
        "name": user["name"],
        "onboarded": user["onboarded"],
    }


@router.post("/preferences")
async def save_preferences(request: PreferencesRequest):
    """Save onboarding preferences."""
    # In a real app, extract user_id from JWT
    # For now, save globally
    return {"status": "saved", "preferences": request.model_dump()}


@router.get("/profile")
async def get_profile():
    """Get user profile."""
    return {
        "name": "Movie Enthusiast",
        "email": "user@cinematch.app",
        "member_since": "April 2026",
        "stats": {
            "movies_rated": 0,
            "watchlist_count": 0,
            "cinebot_chats": 0,
        },
        "preferences": {
            "genres": ["Sci-Fi", "Thriller", "Action"],
            "languages": ["English", "Hindi"],
            "platforms": ["Netflix", "Prime Video"],
        },
    }
