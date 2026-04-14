# BrandOS 🚀

An AI-powered Brand Operating System designed to accelerate the journey from concept to market-ready identity.

![Banner](https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop)

## 🌟 Overview
BrandOS is an end-to-end platform for entrepreneurs and brand designers. It uses generative AI to automate the most time-consuming aspects of brand development:
- **Phase 1: Brand Strategy** - Define the core mission, values, and competitive edge.
- **Phase 2: Visual Identity** - Generate high-fidelity logo concepts and design tokens using FLUX.2 via NVIDIA NIM.
- **Phase 3: Landing Page Generator** - Create a cinematic, production-ready landing page in seconds.

## 🛠️ Tech Stack
This project is built as a **Turborepo Monorepo** for optimal performance and scale.

- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion, GSAP (for cinematic scroll animations).
- **Backend**: Fastify (Node.js), NVIDIA NIM API Integration.
- **AI Models**: 
  - `black-forest-labs/flux.2-klein-4b` for high-fidelity image generation.
  - LLMs for strategic copy generation.
- **Styling**: Premium design system with Glassmorphism, Cinematic film grain, and Dynamic Design tokens.

## 📂 Project Structure
```text
BrandOS/
├── apps/
│   ├── web/               # Next.js Frontend application
│   └── api/               # Fastify Backend (Image & Text generation)
├── packages/              # Shared configurations and utilities
├── package.json           # Monorepo configuration
└── paused.md              # Current development state and upcoming roadmap
```

## 🚀 How It Works
1. **Strategy Alignment**: Input your project description. The AI analyzes market fit and provides a comprehensive brand strategy.
2. **Visual Generation**: Based on the strategy, BrandOS uses the FLUX.2 model to generate cinematic visual concepts.
3. **Landing Page Deployment**: One-click generation of a sleek, animated landing page that incorporates the new brand strategy and visuals.

## 🚦 Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set your `NVIDIA_API_KEY` in `apps/api/.env`.
4. Run the development server: `npm run dev`.

---
*Created with ❤️ by Aryan Yadav*
