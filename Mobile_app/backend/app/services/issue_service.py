# backend/app/services/issue_service.py
import os
from typing import Optional, Dict, Any
from fastapi import UploadFile
from sqlalchemy.orm import Session
from ..config import settings
from ..models.issue import Issue

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

def save_upload(file: UploadFile) -> str:
    ext = (file.filename or "upload").split(".")[-1]
    path = os.path.join(settings.UPLOAD_DIR, f"issue_{os.urandom(4).hex()}.{ext}")
    with open(path, "wb") as f:
        f.write(file.file.read())
    return path

def create_issue(
    db: Session,
    *,
    user_id: Optional[int],
    title: str,
    description: str,
    lat: Optional[float],
    lng: Optional[float],
    image_url: Optional[str],
    ai: Optional[Dict[str, Any]]
) -> Issue:
    issue = Issue(
        user_id=user_id, title=title, description=description,
        lat=lat, lng=lng, image_url=image_url, ai=ai
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue
