# TalentOS Architecture

Human-in-the-loop AI recruitment assistant. AI assists; HR and interviewers make final decisions.

## Services


| Service           | Stack                                       | Port (local) | Responsibility                   |
| ----------------- | ------------------------------------------- | ------------ | -------------------------------- |
| `apps/web`        | Next.js 15, React Query, Zustand, Shadcn UI | 3000         | Web UI                           |
| `apps/api`        | NestJS, JWT, RBAC                           | 3001         | REST API, tenancy, orchestration |
| `apps/ai-service` | FastAPI, LangChain, LangGraph               | 8000         | Document AI, matching, agents    |


## Data

- **MongoDB Atlas** — transactional documents + vector search
- **Supabase Storage** — JD, resumes, transcripts

## Multi-Tenancy

All tenant data is scoped by `organizationId`. JWT carries org context and role.

## Development Phases


| Phase | Focus                                      |
| ----- | ------------------------------------------ |
| 0     | Auth, multi-tenancy, monorepo (current)    |
| 1     | JD extraction + human review               |
| 2     | Resume parsing + candidate profiles        |
| 3     | RAG candidate matching                     |
| 4     | Communication drafts (human-approved send) |
| 5     | Interview assistant                        |
| 6     | Feedback analysis                          |
| 7     | CEO analytics                              |
| 8     | Enterprise hardening                       |


## Module Map (NestJS — planned)

```
src/modules/
├── auth/
├── platform/
├── organizations/
├── users/
├── workflows/
├── jobs/
├── candidates/
├── applications/
├── matching/
├── communications/
├── interviews/
├── feedback/
├── analytics/
├── files/
├── processing-jobs/
└── audit/
```

## AI Workflows (FastAPI — planned)

```
app/
├── agents/       # JD, resume, match, email, interview, feedback
└── workflows/    # LangGraph orchestration graphs
```

## API Conventions

- Base path: `/api/v1`
- Async AI jobs return `202` with `processingJobId`
- Communications require explicit HR approval before send

## Related Docs

- [Getting Started](../README.md) (repo root)
- [Environment Variables](../../.env.example)

