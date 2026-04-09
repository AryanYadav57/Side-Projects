# NEXUM

Nexum is an AI-powered second brain project with a Next.js frontend, FastAPI backend, and PostgreSQL + pgvector for semantic note retrieval.

## Project Status

This project is currently under active development.

Features, APIs, and folder organization may continue to evolve.

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend: FastAPI, Python
- Database: PostgreSQL with pgvector
- Shared Types: TypeScript contracts for notes

## Folder Structure

```text
Nexum2/
├── README.md
├── apps/
│   ├── api/
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── __init__.py
│   │       ├── ingest.py
│   │       ├── main.py
│   │       ├── api/
│   │       ├── core/
│   │       ├── db/
│   │       ├── models/
│   │       ├── schemas/
│   │       └── services/
│   └── web/
│       ├── package.json
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── src/
│           ├── app/
│           ├── components/
│           ├── features/
│           │   ├── landing/
│           │   └── notes/
│           └── lib/
├── docs/
│   └── phase1-setup.md
├── infra/
│   ├── db/
│   │   └── init.sql
│   └── docker/
├── Nexum_Vault/
│   ├── Core Principle.md
│   ├── RAG Pipeline.md
│   └── Obsidian/
└── packages/
	└── shared/
		├── contracts/
		└── types/
```

## Setup

See [docs/phase1-setup.md](docs/phase1-setup.md) for local setup instructions.
