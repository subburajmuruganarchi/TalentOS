from fastapi import APIRouter

from app.api.routes import communications, feedback, interviews, jd, matching, resume

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(jd.router)
api_router.include_router(resume.router)
api_router.include_router(matching.router)
api_router.include_router(communications.router)
api_router.include_router(interviews.router)
api_router.include_router(feedback.router)
