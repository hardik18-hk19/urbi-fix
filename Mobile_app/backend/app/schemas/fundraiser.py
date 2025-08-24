# backend/app/schemas/fundraiser.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FundraiserCreate(BaseModel):
    issue_id: int
    target_amount: float = Field(gt=0)
    currency: str = "INR"
    upi_or_pay_url: Optional[str] = None

class FundraiserOut(BaseModel):
    id: int
    issue_id: int
    creator_user_id: int
    target_amount: float
    collected_amount: float
    currency: str
    upi_or_pay_url: Optional[str]
    qr_image_url: Optional[str]
    active: bool
    created_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True

class ContributionCreate(BaseModel):
    amount: float = Field(gt=0)
    currency: str = "INR"
    contributor_user_id: Optional[int] = None  # optional for anonymous

class ContributionOut(BaseModel):
    id: int
    fundraiser_id: int
    contributor_user_id: Optional[int]
    amount: float
    currency: str
    created_at: datetime

    class Config:
        from_attributes = True

class FundraiserWithContributions(FundraiserOut):
    contributions: List[ContributionOut] = []