from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    ListFlowable,
    ListItem,
    Preformatted,
)


ROOT = Path(r"E:\experimental\app2")
OUTPUT = ROOT / "CineMatch-Project-Review.pdf"


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleLarge",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#6d3531"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubTitle",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#555555"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#2c2c2c"),
            spaceBefore=8,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyJustify",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor("#222222"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SmallNote",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#666666"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="MonoBlock",
            parent=styles["Code"],
            fontName="Courier",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#222222"),
            backColor=colors.HexColor("#f5f2ef"),
            borderPadding=8,
        )
    )
    return styles


def bullet_list(items, styles):
    return ListFlowable(
        [
            ListItem(Paragraph(item, styles["BodyJustify"]), leftIndent=10)
            for item in items
        ],
        bulletType="bullet",
        start="circle",
        leftIndent=16,
        bulletFontName="Helvetica",
        bulletFontSize=9,
        bulletColor=colors.HexColor("#6d3531"),
        spaceBefore=2,
        spaceAfter=8,
    )


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawRightString(195 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
    )

    generated_on = datetime.now().strftime("%d %B %Y")

    mobile_tree = r"""apps/mobile
├── app/
│   ├── _layout.tsx
│   ├── onboarding.tsx
│   ├── +not-found.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── search.tsx
│   │   ├── cinebot.tsx
│   │   ├── watchlist.tsx
│   │   └── profile.tsx
│   └── movie/
│       └── [id].tsx
├── services/
│   ├── api.ts
│   ├── analytics.ts
│   ├── cache.ts
│   ├── preferences.ts
│   ├── feedback.ts
│   ├── experiments.ts
│   └── searchHistory.ts
├── stores/
│   ├── appStatus.ts
│   ├── preferences.ts
│   ├── watchlist.ts
│   └── personalizationFeedback.ts
├── theme/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── index.ts
├── assets/
├── android/
├── app.json
└── package.json"""

    server_tree = r"""server
├── app/
│   ├── main.py
│   ├── config.py
│   └── routers/
│       ├── movies.py
│       ├── cinebot.py
│       ├── users.py
│       ├── ratings.py
│       └── watchlist.py
├── requirements.txt
└── .env"""

    story = [
        Paragraph("CineMatch Project Review", styles["TitleLarge"]),
        Paragraph(
            "Detailed submission review for the CineMatch smart movie recommendation system",
            styles["SubTitle"],
        ),
        Paragraph(
            f"Generated from the live project workspace on {generated_on}",
            styles["SubTitle"],
        ),
        Spacer(1, 8),
        Paragraph("1. Executive Summary", styles["SectionHeading"]),
        Paragraph(
            "CineMatch is a mobile-first movie discovery application built to reduce search fatigue and help users reach a confident watch decision faster. The product combines personalized onboarding, intelligent search, AI-assisted conversational recommendations through CineBot, movie detail conversion flows, and a persistent watchlist system. The solution is supported by a lightweight FastAPI backend and an Expo React Native frontend optimized for Android emulator testing and mobile interaction patterns.",
            styles["BodyJustify"],
        ),
        Paragraph(
            "The project directly addresses the problem of overwhelming choice on streaming platforms by turning passive browsing into guided decision support. Instead of forcing the user to endlessly scroll through unrelated options, CineMatch narrows choices using explicit preferences, interaction feedback, recommendation rails, search assistance, and a conversational assistant that understands natural requests such as mood, language, and genre combinations.",
            styles["BodyJustify"],
        ),
        Paragraph("2. Problem Statement", styles["SectionHeading"]),
        Paragraph(
            "With the rapid growth of streaming platforms, users are confronted with a massive and fragmented catalog of movies spread across genres, languages, and services. This abundance creates friction: users often spend more time browsing than watching. The result is frustration, indecision, and a poor entertainment experience.",
            styles["BodyJustify"],
        ),
        Paragraph(
            "CineMatch solves this by acting as a smart discovery layer. It helps users move from vague intent to actionable recommendations through personalized ranking, guided prompts, detailed movie context, watchlist retention, and conversational AI support. In practical terms, the application reduces decision fatigue and helps users reach a movie choice faster with more confidence.",
            styles["BodyJustify"],
        ),
        Paragraph("3. Proposed Solution", styles["SectionHeading"]),
        Paragraph(
            "The proposed solution is a smart mobile recommendation system that blends structured and conversational discovery. Users first define their taste profile during onboarding, then browse curated home feeds, search dynamically, chat with CineBot, inspect rich detail screens, and save titles for later viewing. Feedback such as “More like this”, “Seen already”, and “Not interested” improves future recommendations and adds a personalization loop that goes beyond static genre filtering.",
            styles["BodyJustify"],
        ),
        Paragraph("4. Core Features Implemented", styles["SectionHeading"]),
        bullet_list(
            [
                "<b>Personalized onboarding:</b> captures preferred languages, genres, moods, and platforms to customize the user journey from the first launch.",
                "<b>Smart home feed:</b> shows trending, top-rated, and Hindi-focused sections with preference-aware ranking and faster cached retrieval.",
                "<b>Advanced search and discovery:</b> includes debounced search, typo assistance, recent searches, trending suggestions, and quick filters for better result quality.",
                "<b>CineBot AI recommendation assistant:</b> supports English, Hindi, and Hinglish-style prompts for movie discovery with fallback logic when upstream AI is unavailable or slow.",
                "<b>Movie detail conversion screen:</b> emphasizes trailer access, save actions, cast visibility, streaming availability, similar picks, and “because you liked” rails.",
                "<b>Persistent watchlist system:</b> supports save/remove actions across screens and includes filters, reminders, and watchlist-specific organization.",
                "<b>Personalization feedback loop:</b> captures negative and positive signals to adapt ranking and make future recommendations more relevant.",
                "<b>Profile and KPI layer:</b> surfaces usage metrics and experimentation state for product-style reporting and insight.",
                "<b>Offline-aware and degraded UX:</b> uses health checks, cache fallback, retry handling, and graceful messaging to keep the app usable under unstable connectivity.",
            ],
            styles,
        ),
        Paragraph("5. Why CineMatch Is One of a Kind", styles["SectionHeading"]),
        bullet_list(
            [
                "It does not rely on only one discovery pattern. CineMatch combines browse, search, save, and AI conversation in one coherent mobile flow.",
                "It is culturally and linguistically aware for Indian usage patterns, especially through Hindi-friendly discovery and platform-aware personalization.",
                "It reduces cognitive overload by translating vague intent such as mood, runtime preference, or “something like X” into concrete, limited choices.",
                "It adds a feedback loop instead of treating recommendations as one-time static results. The app actively learns from “seen”, “not interested”, and “more like this” signals.",
                "It includes reliability layers such as cache fallback, backend health awareness, and fast CineBot degradation handling, which makes it more practical than a purely demo-style AI assistant.",
                "It is mobile-first by design rather than a web app resized to a phone. Navigation, chip-based selection, CTA sizing, safe areas, and screen flows are optimized for touch usage.",
            ],
            styles,
        ),
        Paragraph("6. System Architecture", styles["SectionHeading"]),
        Paragraph(
            "CineMatch uses a client-server architecture. The frontend is an Expo Router based React Native application responsible for UI, local preference persistence, analytics buffering, cached content, and user interaction flows. The backend is a FastAPI application responsible for health checks, CineBot orchestration, user preference sync, watchlist support, and movie-related routing.",
            styles["BodyJustify"],
        ),
        bullet_list(
            [
                "<b>Frontend layer:</b> handles navigation, local state, rendering, cached movie data, personalization feedback, and user experience.",
                "<b>Service layer:</b> centralizes API calls, analytics, preference storage, cache access, experiment assignment, and search history.",
                "<b>State layer:</b> uses Zustand stores for watchlist, preferences, app status, and personalization feedback.",
                "<b>Backend layer:</b> exposes REST endpoints for movies, CineBot chat, users, ratings, watchlist, and health monitoring.",
                "<b>External integrations:</b> TMDB is used for movie metadata and discovery, while NVIDIA NIM/OpenAI-compatible access is used for AI-assisted CineBot responses.",
            ],
            styles,
        ),
        Paragraph("7. Technology Stack", styles["SectionHeading"]),
        bullet_list(
            [
                "<b>Frontend:</b> React 19, React Native 0.81, Expo 54, Expo Router, React Native Paper, Reanimated, Async Storage, Expo Image, Expo Linear Gradient, Expo Haptics, Zustand.",
                "<b>Backend:</b> FastAPI, Uvicorn, Pydantic Settings, OpenAI SDK compatibility for NVIDIA NIM, HTTPX, Python dotenv.",
                "<b>Design System:</b> custom CineMatch theme with centralized colors, spacing, typography, and Material 3 dark theme adaptation.",
                "<b>Data & persistence:</b> AsyncStorage on device for preferences, search history, and cache; in-memory caching for TMDB reads; backend routes for sync and CineBot operations.",
            ],
            styles,
        ),
        PageBreak(),
        Paragraph("8. Folder Structure and Responsibilities", styles["SectionHeading"]),
        Paragraph(
            "The project is organized into a mobile application workspace and a backend service workspace. The separation helps keep UI concerns, app state, and API concerns modular and easier to explain during evaluation.",
            styles["BodyJustify"],
        ),
        Paragraph("Mobile application structure", styles["BodyJustify"]),
        Preformatted(mobile_tree, styles["MonoBlock"]),
        Spacer(1, 8),
        Paragraph("Backend structure", styles["BodyJustify"]),
        Preformatted(server_tree, styles["MonoBlock"]),
        Spacer(1, 8),
        Paragraph(
            "<b>Folder explanation:</b> The <b>app</b> directory contains all user-facing screens and navigation routes. The <b>services</b> directory centralizes reusable logic and API integrations. The <b>stores</b> directory contains global app state. The <b>theme</b> directory standardizes UI styling tokens. On the backend, the <b>routers</b> directory separates domain endpoints, while <b>main.py</b> composes the FastAPI application and <b>config.py</b> manages runtime configuration.",
            styles["BodyJustify"],
        ),
        Paragraph("9. Frontend Screen-by-Screen Review", styles["SectionHeading"]),
        bullet_list(
            [
                "<b>Onboarding:</b> introduces personalization by collecting languages, genres, moods, and platforms. This is the first major mechanism for reducing irrelevant recommendations.",
                "<b>Home:</b> serves as the main discovery dashboard with personalized trending content, top-rated rails, Hindi-focused recommendations, trailer highlight cards, and quick save actions.",
                "<b>Search:</b> supports live debounced querying, genre filters, recent queries, trending suggestions, typo recovery, and result cards with quick watchlist actions.",
                "<b>CineBot:</b> provides guided prompt chips, follow-up suggestions, and AI-assisted recommendations in a conversational UI with fallback behavior for reliability.",
                "<b>Watchlist:</b> stores selected movies and provides sorting, reminders, and fast access to saved content, strengthening retention and completion intent.",
                "<b>Profile:</b> exposes preferences, product metrics, and experiment state, making the app feel more productized than a one-screen demo.",
                "<b>Movie Detail:</b> acts as the conversion layer where the user validates a recommendation through synopsis, trailer, cast, streaming info, and similar picks before deciding to watch or save.",
            ],
            styles,
        ),
        Paragraph("10. Backend Review", styles["SectionHeading"]),
        bullet_list(
            [
                "<b>Health endpoint:</b> allows the mobile app to detect whether backend features are available and present graceful fallback states.",
                "<b>Movie router:</b> supports discovery-style movie operations and backend integration points.",
                "<b>CineBot router:</b> orchestrates AI recommendation requests and includes hard timeout behavior plus fallback responses when the upstream model is slow or unavailable.",
                "<b>User router:</b> receives preference sync data from onboarding and profile updates.",
                "<b>Ratings and watchlist routers:</b> support movie interaction state beyond simple browsing.",
            ],
            styles,
        ),
        Paragraph(
            "The backend is intentionally lightweight and practical for a project submission. It focuses on enabling mobile experiences rather than overengineering infrastructure. This keeps the architecture understandable and deployable while still demonstrating API design, configuration handling, and AI integration.",
            styles["BodyJustify"],
        ),
        Paragraph("11. How CineMatch Solves the Problem Statement", styles["SectionHeading"]),
        bullet_list(
            [
                "It shortens the path from “I want to watch something” to “I know what to watch” by narrowing options through onboarding and ranking.",
                "It reduces browsing fatigue by showing limited, meaningful, personalized rails instead of a random content wall.",
                "It supports different discovery styles: direct search for specific intent, guided chips for lightweight exploration, and CineBot for natural language exploration.",
                "It improves confidence through detail screens that explain why a title is worth watching, where it is available, and what similar options exist.",
                "It preserves decision progress through watchlist and chat persistence, so users do not have to restart their discovery journey each time.",
                "It becomes smarter over time through interaction feedback, turning the recommendation system into an adaptive product rather than a static catalog viewer.",
            ],
            styles,
        ),
        Paragraph("12. Reliability, Performance, and UX Quality", styles["SectionHeading"]),
        bullet_list(
            [
                "Type safety was validated with TypeScript compilation.",
                "Expo Doctor checks were passed, indicating a healthy mobile project configuration.",
                "Backend Python modules compile successfully.",
                "TMDB responses are cached in memory to reduce repeated network cost and improve perceived UI speed.",
                "Search uses debouncing and stale-request protection to avoid jitter and race conditions.",
                "CineBot now includes explicit timeout handling to prevent UI hangs and returns safe fallback recommendations when needed.",
                "Lists were tuned with virtualization-friendly properties to improve Android scrolling smoothness.",
                "UI states include skeleton loading, empty states, notice bars, retries, and offline-aware fallback copy.",
            ],
            styles,
        ),
        Paragraph("13. Submission Strengths", styles["SectionHeading"]),
        bullet_list(
            [
                "The app demonstrates both product thinking and technical implementation, not just API wiring.",
                "The architecture is modular and explainable, which is important for viva, demo, and evaluation settings.",
                "The project includes personalization, AI, caching, analytics signals, and retention features in one mobile experience.",
                "The solution is closely aligned to a real-world streaming pain point and is not limited to a generic recommendation prototype.",
                "The interface has been refined toward a submission-ready state with consistent visual hierarchy and mobile interaction behavior.",
            ],
            styles,
        ),
        Paragraph("14. Scope Completion and Future Enhancements", styles["SectionHeading"]),
        Paragraph(
            "According to the internal progress summary, the planned scope has been completed across eight implementation phases. The current product is feature-complete for its targeted academic submission scope. Recommended future work includes automated end-to-end testing, production-grade backend persistence, long-term analytics export, secret hardening, and broader multi-device QA.",
            styles["BodyJustify"],
        ),
        Paragraph("15. Final Conclusion", styles["SectionHeading"]),
        Paragraph(
            "CineMatch is a strong example of a smart movie recommendation system designed around a practical and relevant real-world problem: users feel overwhelmed by too much streaming choice. The project stands out because it does not stop at simply filtering movies. Instead, it combines personalization, guided exploration, conversational AI, caching, and retention flows to help users arrive at a movie choice faster and with less frustration. In that sense, CineMatch is not just a movie browser; it is a decision-support product built for modern streaming behavior.",
            styles["BodyJustify"],
        ),
        Spacer(1, 12),
        Paragraph(
            "Prepared from the implemented CineMatch codebase for project submission and presentation use.",
            styles["SmallNote"],
        ),
    ]

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
