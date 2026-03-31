from duckduckgo_search import DDGS
import re

def fetch_music_links(artist_name: str):
    """
    Fetches Spotify, SoundCloud, and Discogs links for an artist
    using DuckDuckGo search.
    """
    try:
        with DDGS() as ddgs:
            # Search for social/music handles
            query = f"{artist_name} spotify soundcloud discogs instagram"
            results = list(ddgs.text(query, max_results=8))
            
            links = []
            seen_platforms = set()
            
            platforms = {
                "spotify.com": "Spotify",
                "soundcloud.com": "SoundCloud",
                "discogs.com": "Discogs",
                "instagram.com": "Instagram",
                "apple.com": "Apple Music",
                "youtube.com": "YouTube"
            }
            
            for r in results:
                href = r.get("href", "")
                for domain, name in platforms.items():
                    if domain in href and name not in seen_platforms:
                        links.append({"name": name, "url": href})
                        seen_platforms.add(name)
                        break
            
            return links
    except Exception as e:
        print(f"Music Service Error: {e}")
        return []

def fetch_discography_snippet(artist_name: str):
    """
    Fetches a quick snippet of the artist's discography/top tracks.
    """
    try:
        with DDGS() as ddgs:
            query = f"{artist_name} discography top tracks"
            results = list(ddgs.text(query, max_results=3))
            
            # Combine snippets
            snippet = " ".join([r.get("body", "") for r in results])
            # Basic cleaning
            snippet = re.sub(r'[\t\r\n]', ' ', snippet)
            return snippet[:500] + "..." if len(snippet) > 500 else snippet
    except:
        return ""
