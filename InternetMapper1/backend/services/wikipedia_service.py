import wikipediaapi
from duckduckgo_search import DDGS

def fetch_duckduckgo_fallback(topic: str) -> dict:
    """Fallback knowledge fetcher using DuckDuckGo search."""
    try:
        results = DDGS().text(topic, max_results=10)
        if not results:
            raise ValueError()
        
        combined_text = "\n\n".join([f"{r['title']}: {r['body']}" for r in results])
        summary = results[0]['body'] if results else "No summary available."
        
        return {
            "title": topic.title() + " (Web Search)",
            "summary": summary,
            "text": combined_text,
        }
    except Exception:
        raise ValueError(f"No Wikipedia page or Web Search results found for topic: '{topic}'")

def fetch_wikipedia_content(topic: str, deep_search: bool = False) -> dict:
    """
    Fetch the Wikipedia page for a given topic.
    If the page doesn't exist, aggressively fallback to a deep Web Search (DuckDuckGo) 
    to aggregate niche data (e.g. underground culture, new artists) for NLP analysis.
    If deep_search is True, bypass Wikipedia completely and go straight to DuckDuckGo.
    """
    if deep_search:
        return fetch_duckduckgo_fallback(topic)

    wiki = wikipediaapi.Wikipedia(
        language="en",
        user_agent="InternetKnowledgeMapper/1.0 (educational project)"
    )

    page = wiki.page(topic)

    if not page.exists():
        return fetch_duckduckgo_fallback(topic)

    return {
        "title": page.title,
        "summary": page.summary,
        "text": page.text,
    }
