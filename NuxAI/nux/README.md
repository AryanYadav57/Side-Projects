# Nux AI

Nux is a safety-first AI web app focused on harm reduction, substance-awareness education, and emergency-risk escalation guidance.

## Highlights

- Safety-constrained AI chat with refusal rules for sourcing, synthesis, and unsafe optimization.
- Image analysis endpoint with uncertainty-aware risk framing.
- Local multi-thread chat history with pin, archive, restore, and search.
- Crisis mode checklist with one-tap emergency call action.
- Feedback loop (`Helpful` / `Not Helpful`) for response quality tracking.
- Mobile-ready UI with responsive chat composer and sidebar drawer.
- PWA-ready setup with manifest and service worker registration.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- GSAP + Framer Motion
- OpenAI SDK (with provider-aware routing and fallback behavior)

## Folder Structure

```text
nux/
	public/
		sw.js
	src/
		app/
			api/
				analyze-image/route.ts
				chat/route.ts
				feedback/route.ts
			chat/page.tsx
			safety/page.tsx
			layout.tsx
			manifest.ts
			page.tsx
		components/
			nux/
				landing-screen.tsx
				nux-app.tsx
				pwa-register.tsx
		lib/
			ai-client.ts
			crisis.ts
			mock-vision.ts
			rate-limit.ts
			safety.ts
		types/
			chat.ts
	.env.example
	next.config.ts
	package.json
	README.md
```

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Create environment file.

```bash
cp .env.example .env.local
```

3. Configure API keys in `.env.local`.

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VISION_MODEL=gpt-4.1-mini
```

4. Start development server.

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Routes

- `POST /api/chat`: safety-first conversational response (stream/non-stream).
- `POST /api/analyze-image`: uncertainty-aware image risk analysis.
- `POST /api/feedback`: captures helpful/not-helpful message feedback.

## Safety Model

- Educational guidance only, never a substitute for medical care.
- Refuses illegal procurement or dangerous instruction pathways.
- Includes red-flag escalation guidance for urgent symptom patterns.

## Deploy Notes

- Build command: `npm run build`
- Start command: `npm run start`
- Ensure `OPENAI_API_KEY` and model vars are set in deployment environment.
