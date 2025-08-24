# backend/app/api/forum.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..models.user import User
from ..models.forum_post import ForumPost
from ..schemas.forum_post import ForumPostCreate, ForumPostOut
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/forum", tags=["Forum"])

# Internal helper to create a post programmatically (used by fundraiser hooks)
# No auth dependency here; caller should ensure author identity string.
from sqlalchemy.orm import Session

def create_post_internal(
    db: Session,
    *,
    title: str,
    content: str,
    category: str,
    author_name: str,
    issue_id: int | None = None,
    fundraiser_id: int | None = None,
) -> ForumPost:
    post = ForumPost(
        title=title,
        content=content,
        category=category,
        author_name=author_name,
        issue_id=issue_id,
        fundraiser_id=fundraiser_id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.get("/posts", response_model=List[ForumPostOut])
def get_posts(db: Session = Depends(get_db)):
    return db.query(ForumPost).order_by(ForumPost.id.desc()).all()

@router.post("/posts", response_model=ForumPostOut)
def create_post(
    payload: ForumPostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return create_post_internal(
        db,
        title=payload.title,
        content=payload.content,
        category=payload.category,
        author_name=user.name,
        issue_id=payload.issue_id,
        fundraiser_id=payload.fundraiser_id,
    )

@router.get("/posts/{post_id}", response_model=ForumPostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.get(ForumPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post