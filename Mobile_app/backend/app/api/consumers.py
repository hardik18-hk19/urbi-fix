# backend/app/api/consumers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..db import get_db
from ..models.user import User
from ..models.consumer import Consumer
from ..schemas.consumer import ConsumerCreate, ConsumerOut
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/consumers", tags=["Consumers"])

@router.get("/me", response_model=ConsumerOut)
def get_my_consumer(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Consumer).filter(Consumer.user_id == user.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consumer profile not found")
    return c

@router.post("", response_model=ConsumerOut)
def create_or_update_consumer(payload: ConsumerCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Consumer).filter(Consumer.user_id == user.id).first()
    if c is None:
        c = Consumer(user_id=user.id)
        db.add(c)
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(c, k, v)
    # Also mirror phone into user if provided
    if payload.phone:
        user.phone = payload.phone
        db.add(user)
    db.commit()
    db.refresh(c)
    return c