# backend/app/schemas/booking.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BookingCreate(BaseModel):
    provider_id: int
    service_category: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = ""
    consumer_lat: Optional[float] = None
    consumer_lng: Optional[float] = None

class BookingAutoCreate(BaseModel):
    service_category: Optional[str] = None
    notes: Optional[str] = ""
    consumer_lat: float
    consumer_lng: float
    within_km: float = 5.0

class BookingUpdateStatus(BaseModel):
    # Allow extended statuses for real-time progress
    status: str  # requested|accepted|declined|scheduled|completed|canceled|on_the_way|arrived|started
    scheduled_at: Optional[datetime] = None
    eta_minutes: Optional[int] = None
    price_amount: Optional[float] = None
    price_currency: Optional[str] = None

class BookingLocationUpdate(BaseModel):
    lat: float
    lng: float

class BookingRatingCreate(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = ""

class BookingFundingContribution(BaseModel):
    amount: float = Field(gt=0, description="Contribution amount must be positive")

class BookingOut(BaseModel):
    id: int
    customer_id: int
    provider_id: int
    service_category: str | None
    status: str
    scheduled_at: datetime | None
    notes: str
    consumer_lat: float | None
    consumer_lng: float | None
    provider_live_lat: float | None
    provider_live_lng: float | None
    rating_stars: int | None
    rating_comment: str | None
    rated_at: datetime | None
    eta_minutes: int | None
    price_amount: float | None
    price_currency: str | None
    issue_id: int | None
    funding_goal: float | None
    funding_current: float | None
    funding_contributions: list | None
    auto_assign_enabled: int | None
    # Provider information
    provider_name: str | None = None
    provider_phone: str | None = None
    provider_rating: float | None = None

    class Config:
        from_attributes = True
