# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, engine
from .api import (
    auth as auth_router,
    issues as issues_router,
    providers as providers_router,
    bookings as bookings_router,
    ai as ai_router,
    forum as forum_router,
    votes as votes_router,
    consumers as consumers_router,
    fundraisers as fundraisers_router,
    self_help as self_help_router,
)

# Create DB tables on startup (dev mode only)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Hackademia Backend",
    version="0.1.0",
    description="API backend for Hackademia project",
)

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Static uploads (serve files saved to UPLOAD_DIR)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ✅ Routers with common prefix
app.include_router(auth_router.router, prefix="/api")
app.include_router(providers_router.router, prefix="/api")
app.include_router(consumers_router.router, prefix="/api")
app.include_router(issues_router.router, prefix="/api")
app.include_router(bookings_router.router, prefix="/api")
app.include_router(ai_router.router, prefix="/api")
app.include_router(forum_router.router, prefix="/api")
app.include_router(votes_router.router, prefix="/api")
app.include_router(fundraisers_router.router, prefix="/api")
app.include_router(self_help_router.router, prefix="/api")

# Negotiation (dynamic pricing & AI)
from .negotiation.routes import router as negotiation_router
app.include_router(negotiation_router, prefix="/api")

# ✅ Health check
@app.get("/")
def health_check():
    return {"status": "ok"}
