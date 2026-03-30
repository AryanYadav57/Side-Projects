# mMapper (Internet Knowledge Mapper)

<p align="center">
  <em>Turn any topic into an interactive, interconnected AI Knowledge Graph.</em>
  <br>
  <strong>Created by <a href="https://github.com/AryanYadav57">Aryan Yadav</a></strong>
</p>

## 🌌 Overview
**mMapper** is a high-performance web application that dynamically generates force-directed knowledge graphs from any search query. Instead of reading endless articles, type in a concept—whether it's "Artificial Intelligence," "World War II," or an extremely niche underground music artist—and watch as mMapper extracts entities, parses their semantic relationships, and maps them in a cinematic, interactive UI.

## ✨ Core Features
*   **Cinematic D3.js Visualization**: Buttery-smooth physics, pulsing node selections, drag-and-drop layout, and scalable vectorized graphs.
*   **Deep Semantic NLP**: Uses `spaCy` to run Subject-Verb-Object (SVO) dependency parsing. mMapper doesn't just know that two things are connected; it knows *how* they are connected (e.g., `FOUNDED_BY`, `PART_OF`, `LOCATED_IN`).
*   **Aggressive Niche Fallback**: Natively uses the Wikipedia API for high-quality data. If a page doesn't exist, it intelligently falls back to DuckDuckGo search and BeautifulSoup web scraping to map entirely undocumented or niche topics.
*   **Smart Sidebar Context**: Click a node to read its Wikipedia summary, or click an edge to explicitly read the exact source sentence that binds two entities together.

## 🛠 Tech Stack
*   **Backend**: Python 3.13, FastAPI, Uvicorn
*   **NLP / Scraping Pipeline**: spaCy (`en_core_web_sm`), Wikipedia-API, duckduckgo-search, BeautifulSoup4
*   **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript, D3.js (v7)

## 🚀 How to Run Locally

### 1. Requirements
Ensure you have Python 3.10+ installed.
You will need to download the `en_core_web_sm` model for spaCy.

### 2. Setup
Clone the repository and install the dependencies:
```powershell
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 3. Run the Backend
Navigate to the `backend` directory and start the FastAPI server:
```powershell
cd backend
uvicorn main:app --reload --port 8000
```
*The API will start at `http://127.0.0.1:8000`. You can view the swagger docs at `/docs`.*

### 4. Run the Frontend
Simply double-click or open `frontend/index.html` in any modern browser (Chrome, Edge, Firefox, Safari). The UI connects directly to your local backend API.

## 🧠 Why is this helpful?
In an era of information overload, **mMapper** serves as a visual learning accelerator. It is perfect for:
*   **Students & Researchers**: Quickly visualizing the landscape of a new subject area.
*   **Writers**: Discovering hidden semantic links between historical events or concepts.
*   **Curious Minds**: Exploring rabbit holes in a visual, intuitive format rather than reading linear text.

## 📄 License
This project is open-source and free to use. Designed and developed by Aryan Yadav.
