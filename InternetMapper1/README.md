# mMapper 2.0 (Internet Knowledge Mapper)

<p align="center">
  <img src="https://github.com/AryanYadav57/Side-Projects/blob/main/InternetMapper1/frontend/assets/logo.png?raw=true" width="80" height="80" alt="mMapper Logo">
  <br>
  <em>Turn any topic into an interactive, interconnected AI Knowledge Graph.</em>
  <br>
  <strong>Designed and Developed by <a href="https://github.com/AryanYadav57">Aryan Yadav</a></strong>
</p>

---

## 🌌 Overview
**mMapper** is a high-performance, AI-powered web application that dynamically generates force-directed knowledge graphs from any search query. Instead of reading endless linear articles, type in a concept—from "Quantum Computing" to "Rick Owens"—and watch as mMapper extracts entities, parses their semantic relationships, and maps them in a cinematic, interactive 3D-feeling UI.

## ✨ New in v2.0 (Latest Updates)
*   **🐇 Rabbit Hole Mode**: A revolutionary automated discovery feature. Once activated, the AI intelligently selects high-importance nodes and "digs deeper" every few seconds, automatically expanding your knowledge map into multiple "Phases" without manual effort.
*   **⚡ Adaptive Fidelity Rendering**: Optimized for "lag-free" mapping. The engine now detects graph complexity and intelligently simplifies expensive SVG filters (glows/blur) for large maps (>40 nodes) to maintain a silky-smooth 60fps experience.
*   **🧬 Subject-Verb-Object (SVO) Parsing**: Enhanced NLP pipeline using `spaCy` to identify explicit directed relationships like `FOUNDED_BY`, `PART_OF`, `LOCATED_IN`, and `INFLUENCED_BY`.
*   **🏗️ Robust Backend Architecture**: Migration to a standardized absolute-import structure for better scalability and faster local deployment.

## 🛠 Features
*   **Cinematic D3.js Visualization**: Interactive physics, pulsing node selections, zoom/pan navigation, and high-quality PNG export.
*   **Aggressive Niche Fallback**: Uses Wikipedia API for primary data, but intelligently falls back to DuckDuckGo and custom web scraping for extremely niche or undocumented topics.
*   **Smart Sidebar Context**: Instant access to entity summaries and the exact "evidence sentences" from the source text that justify every connection.
*   **Temporal Filtering**: (Beta) Filter connections by year mentioned in the text to see how a topic evolved over time.

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- A modern web browser

### 2. Installation
Clone the repository and install dependencies:
```powershell
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 3. Launching mMapper
**Start the Backend API:**
```powershell
# From the project root
python -m uvicorn backend.main:app --reload --port 8000
```

**Start the Frontend:**
Open `frontend/index.html` in your browser. For a better experience, run it via a local server:
```powershell
# Using Python's built-in server
python -m http.server 5500 --directory frontend
```

Visit `http://127.0.0.1:5500` to start mapping!

## 🧠 Why mMapper?
In an age of information overload, **mMapper** serves as a visual learning accelerator. It's designed for researchers, students, and the terminally curious who want to see the "Big Picture" of a topic instantly.

## 📄 License
Open-source under the MIT License. Created with ❤️ by Aryan Yadav.
