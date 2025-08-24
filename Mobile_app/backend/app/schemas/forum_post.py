# backend/app/schemas/forum_post.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ForumPostCreate(BaseModel):
    title: str
    content: str
    category: str = "general"
    issue_id: Optional[int] = None
    fundraiser_id: Optional[int] = None

class ForumPostOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    author_name: str
    created_at: datetime
    issue_id: Optional[int] = None
    fundraiser_id: Optional[int] = None

    class Config:
        from_attributes = True