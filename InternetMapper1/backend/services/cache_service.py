import sqlite3
import json
import os
from pathlib import Path

# Database path: backend/data/cache.db
DB_PATH = Path(__file__).parent.parent / "data" / "cache.db"

class GraphCache:
    def __init__(self):
        # Ensure data directory exists
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        """Initializes the SQLite database and table."""
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS graphs (
                    topic TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def get(self, topic: str):
        """Retrieves a cached graph by topic."""
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.execute("SELECT data FROM graphs WHERE topic = ?", (topic.lower().strip(),))
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            print(f"Cache Read Error: {e}")
        return None

    def set(self, topic: str, data: dict):
        """Caches a graph for a given topic."""
        try:
            # Ensure data is serializable
            json_data = json.dumps(data)
            with sqlite3.connect(DB_PATH) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO graphs (topic, data, timestamp) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    (topic.lower().strip(), json_data)
                )
                conn.commit()
        except Exception as e:
            print(f"Cache Write Error: {e}")

# Singleton instance
cache = GraphCache()
