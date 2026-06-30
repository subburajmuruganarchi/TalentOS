# FastAPI service for document AI, RAG matching, and LangGraph workflows.

## Local Development

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Health check: http://localhost:8000/health

## Job Description Extraction

`POST /api/v1/jd/extract`

```json
{
  "text": "Senior Backend Engineer with 5+ years..."
}
```

Response: structured JSON with `job_title`, `experience`, `required_skills`, `mandatory_skills`, `responsibilities`, `interview_criteria`.

## Resume Analysis

### From text

`POST /api/v1/resumes/extract`

```json
{
  "text": "Jane Doe | jane@email.com | Senior Engineer..."
}
```

### From document (PDF, DOCX)

`POST /api/v1/resumes/extract/document` — multipart form field `file`

Response: candidate profile JSON with `candidate`, `skills`, `experience`, `projects`, `education`, `certifications`, `total_experience_years`.

Legacy `.doc` files should be converted to DOCX/PDF or submitted as text.

### LLM abstraction

Set `LLM_PROVIDER` in `.env`:

| Provider   | Env vars                          | Extra package          |
|------------|-----------------------------------|------------------------|
| `openai`   | `OPENAI_API_KEY`, `OPENAI_MODEL`  | included               |
| `anthropic`| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | `langchain-anthropic` |
| `ollama`   | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | `langchain-ollama`     |
