"""
CineBot Router — AI chatbot powered by NVIDIA NIM API.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import re
import time

from app.config import settings

router = APIRouter()


def _request_llm_completion(messages: list[dict]):
    """Run the upstream LLM request in a worker thread so we can enforce a hard timeout."""
    from openai import OpenAI

    client = OpenAI(
        base_url=settings.NVIDIA_BASE_URL,
        api_key=settings.NVIDIA_API_KEY,
        timeout=settings.NVIDIA_TIMEOUT_SECONDS,
    )

    return client.chat.completions.create(
        model=settings.NVIDIA_MODEL,
        messages=messages,
        temperature=1,
        top_p=0.95,
        max_tokens=700,
    )


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    user_preferences: Optional[dict] = None


class MovieRecommendation(BaseModel):
    title: str
    year: int
    genres: list[str]
    imdb_rating: float
    reason: str


class ChatResponse(BaseModel):
    reply: str
    recommendations: list[MovieRecommendation] = []


SYSTEM_PROMPT = """You are CineBot, a friendly and knowledgeable movie recommendation assistant for the CineMatch app. You help users discover movies they'll love.

RULES:
1. Always return EXACTLY 3 movie recommendations per query
2. Return valid JSON matching the schema provided
3. Only recommend REAL movies that exist — never hallucinate titles
4. Consider the user's preferences when provided
5. Each recommendation must include a personalised one-sentence reason
6. Support English, Hindi, and Hinglish queries
7. If you're unsure, ask a clarifying question instead of guessing
8. Maintain a conversational tone — warm, enthusiastic, not robotic
9. Understand mood descriptors, genre combos, comparisons, and constraints
10. If asked about non-movie topics, gently redirect to movie discovery

OUTPUT FORMAT — Return ONLY this JSON, nothing else:
{
  "reply": "Your conversational text response here",
  "recommendations": [
    {
      "title": "Movie Title",
      "year": 2024,
      "genres": ["Genre1", "Genre2"],
      "imdb_rating": 8.1,
      "reason": "Why this user will love it"
    }
  ]
}"""


def extract_json(text: str) -> dict:
    """Extract JSON from LLM response text."""
    # Try to find JSON block
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    return {"reply": text, "recommendations": []}


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with CineBot."""
    started_at = time.perf_counter()

    # Build messages for LLM
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Add user preferences context
    if request.user_preferences:
        prefs = request.user_preferences
        pref_context = f"\nUser preferences: Genres={prefs.get('genres', [])}, Languages={prefs.get('languages', [])}, Platforms={prefs.get('platforms', [])}"
        messages[0]["content"] += pref_context
    
    # Add conversation history (last 5)
    for msg in request.history[-5:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    
    # Add current message
    messages.append({"role": "user", "content": request.message})
    
    try:
        if not settings.NVIDIA_API_KEY:
            return _fallback_response(request.message)
        
        response = await asyncio.wait_for(
            asyncio.to_thread(_request_llm_completion, messages),
            timeout=settings.NVIDIA_TIMEOUT_SECONDS + 1,
        )
        
        raw_reply = response.choices[0].message.content or ""
        parsed = extract_json(raw_reply)
        
        recs = []
        for rec in parsed.get("recommendations", []):
            try:
                recs.append(MovieRecommendation(**rec))
            except Exception:
                continue

        if len(recs) == 0:
            return _fallback_response(request.message)

        return ChatResponse(
            reply=parsed.get("reply", raw_reply),
            recommendations=recs[:3],
        )
    
    except Exception as e:
        elapsed = time.perf_counter() - started_at
        print(f"CineBot LLM error after {elapsed:.2f}s: {e}")
        return _fallback_response(request.message)


def _fallback_response(message: str) -> ChatResponse:
    """Rule-based fallback when LLM is unavailable."""
    message_lower = message.lower()
    
    if "horror" in message_lower or "scary" in message_lower:
        return ChatResponse(
            reply="Here are some great horror picks!",
            recommendations=[
                MovieRecommendation(title="Get Out", year=2017, genres=["Horror", "Thriller"], imdb_rating=7.7, reason="A mind-bending social thriller that redefines horror."),
                MovieRecommendation(title="The Conjuring", year=2013, genres=["Horror"], imdb_rating=7.5, reason="Classic supernatural horror with genuine scares."),
                MovieRecommendation(title="Stree", year=2018, genres=["Horror", "Comedy"], imdb_rating=7.0, reason="A hilarious Bollywood horror-comedy gem."),
            ],
        )
    elif "comedy" in message_lower or "funny" in message_lower or "laugh" in message_lower:
        return ChatResponse(
            reply="Time for some laughs!",
            recommendations=[
                MovieRecommendation(title="3 Idiots", year=2009, genres=["Comedy", "Drama"], imdb_rating=8.4, reason="Heartwarming comedy about friendship and education."),
                MovieRecommendation(title="The Grand Budapest Hotel", year=2014, genres=["Comedy", "Drama"], imdb_rating=8.1, reason="Wes Anderson's quirky masterpiece — visually stunning."),
                MovieRecommendation(title="Hera Pheri", year=2000, genres=["Comedy"], imdb_rating=8.1, reason="The ultimate Bollywood comedy — iconic dialogues."),
            ],
        )
    else:
        return ChatResponse(
            reply="Here are some universally loved picks!",
            recommendations=[
                MovieRecommendation(title="Inception", year=2010, genres=["Sci-Fi", "Thriller"], imdb_rating=8.8, reason="A mind-bending journey through layers of dreams."),
                MovieRecommendation(title="Dil Chahta Hai", year=2001, genres=["Drama", "Comedy"], imdb_rating=8.1, reason="A timeless tale of friendship and growing up."),
                MovieRecommendation(title="Interstellar", year=2014, genres=["Sci-Fi", "Drama"], imdb_rating=8.7, reason="Epic space exploration with emotional depth."),
            ],
        )
