# TalentOS

Enterprise AI-assisted recruitment SaaS platform. Human-in-the-loop AI for JD processing, resume analysis, candidate matching, interview assistance, and feedback synthesis.

## Monorepo Structure

```
talentos/
├── apps/
│   ├── web/           # Next.js 15 — frontend
│   ├── api/           # NestJS — REST API
│   └── ai-service/    # FastAPI — AI / LangChain / LangGraph
├── packages/
│   └── shared-types/  # Shared TypeScript types
├── docs/              # Architecture & guides
├── infra/docker/      # Local development stack
└── .github/workflows/ # CI/CD
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

## Quick Start

### 1. Install dependencies

```bash
npm install
cd apps/ai-service && python -m venv .venv && pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/ai-service/.env.example apps/ai-service/.env
```

### 3. Start infrastructure

```bash
npm run docker:up
```

### 4. Run applications

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Web
npm run dev:web

# Terminal 3 — AI Service
cd apps/ai-service && .venv/Scripts/activate && uvicorn app.main:app --reload --port 8000
```

| Service    | URL                   |
|------------|-----------------------|
| Web        | http://localhost:3000 |
| API        | http://localhost:3001 |
| AI Service | http://localhost:8000 |

## Documentation

See [docs/architecture/README.md](docs/architecture/README.md) for system design.

## License

Proprietary — All rights reserved.
