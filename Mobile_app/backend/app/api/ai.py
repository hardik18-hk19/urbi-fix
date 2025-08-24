from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI"])

# Import your implemented AutoTagger from app/ai/*
try:
    from ..ai.auto_tagger import AutoTagger
    _autotagger = AutoTagger()
except Exception:
    _autotagger = None

class AutoTagRequest(BaseModel):
    text: str

class ScheduleRequest(BaseModel):
    description: str
    location: Optional[str] = None

@router.post("/auto-tag")
def auto_tag_text(payload: AutoTagRequest):
    if not _autotagger:
        raise HTTPException(status_code=503, detail="AI pipeline not available")
    return _autotagger.classify_text(payload.text)  # Works with new wrapper in auto_tagger.py

@router.post("/schedule")
def generate_schedule(payload: ScheduleRequest):
    if not _autotagger:
        raise HTTPException(status_code=503, detail="AI pipeline not available")
    # Basic schedule suggestion - you can enhance this with actual AI logic
    return {
        "suggested_times": [
            "09:00 AM - 11:00 AM",
            "02:00 PM - 04:00 PM",
            "04:00 PM - 06:00 PM"
        ],
        "priority": "medium",
        "estimated_duration": "2 hours",
        "recommendations": [
            "Schedule during business hours for better availability",
            "Consider weather conditions if outdoor work is required"
        ]
    }

@router.post("/auto-tag-with-image")
def auto_tag_with_image(text: str = Form(...), file: UploadFile = File(...)):
    if not _autotagger:
        raise HTTPException(status_code=503, detail="AI pipeline not available")
    file_bytes = file.file.read()
    return _autotagger.analyze(text=text, file_bytes=file_bytes)  # Use existing analyze method
