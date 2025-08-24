# backend/app/api/self_help.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from ..db import get_db
from ..models.user import User
from ..models.issue import Issue
from ..models.fundraiser import Fundraiser
from ..services.auth_service import get_current_user
from ..services.fundraiser_service import create_fundraiser

router = APIRouter(prefix="/self-help", tags=["Self-Help"])


@router.post("/{issue_id}/enable", response_model=bool)
def enable_self_help(issue_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    issue = db.query(Issue).get(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if issue.user_id and issue.user_id != user.id:
        raise HTTPException(status_code=403, detail="Only the issue creator can enable self-help")

    # Check 24-hour window since escalation
    if not issue.escalated_at:
        raise HTTPException(status_code=400, detail="Issue has not been escalated")
    if datetime.utcnow() - issue.escalated_at < timedelta(hours=24):
        raise HTTPException(status_code=400, detail="24-hour wait not yet over")

    # Create a placeholder fundraiser with zero target; client can update real target via /fundraisers
    f = create_fundraiser(db, issue_id=issue_id, creator_user_id=user.id, target_amount=1.0, currency="INR")
    return True