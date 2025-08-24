# backend/app/schemas/issue.py
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class IssueCreate(BaseModel):
    title: str
    description: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    analyze: bool = True  # run AI classification if true

class IssueOut(BaseModel):
    id: int
    title: str
    description: str
    lat: float | None
    lng: float | None
    status: str
    image_url: str | None
    ai: Any | None
    complaint_draft: Optional[str] = None
    escalated: Optional[bool] = False
    escalated_to: Optional[str] = None
    escalated_at: Optional[datetime] = None
    # Include owner id so client can enforce permissions (e.g., escalate)
    user_id: Optional[int] = None
    # Crowdfunding fields
    funding_goal: Optional[float] = None
    funding_current: Optional[float] = None
    funding_contributions: Optional[list] = None
    auto_assign_enabled: Optional[int] = None
    assigned_booking_id: Optional[int] = None

    class Config:
        from_attributes = True

class ComplaintEscalateRequest(BaseModel):
    draft: Optional[str] = None  # Optional edited draft to send

class EmailComposeResponse(BaseModel):
    recipient: str
    subject: str
    body: str
    mailto: str

class OfficialStatusUpdate(BaseModel):
    status: str  # acknowledged|in_progress|resolved|rejected