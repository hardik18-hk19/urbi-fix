# backend/app/api/votes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Literal
from pydantic import BaseModel

from ..db import get_db
from ..models.issue import Issue

router = APIRouter(prefix="/votes", tags=["Votes"])

# In-memory votes storage (replace with DB model later)
_votes: dict[int, int] = {}  # issue_id -> score


class VoteRequest(BaseModel):
    value: Literal[-1, 1]


@router.post("/{issue_id}")
def vote_issue(issue_id: int, payload: VoteRequest, db: Session = Depends(get_db)):
    # Fetch the issue; return 404 if it doesn't exist
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Update in-memory score using provided value from request body
    _votes[issue_id] = _votes.get(issue_id, 0) + int(payload.value)
    return {"issue_id": issue_id, "score": _votes[issue_id]}


@router.get("/scores")
def get_scores():
    return _votes