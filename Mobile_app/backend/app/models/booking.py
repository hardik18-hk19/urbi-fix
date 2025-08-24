# backend/app/models/booking.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, func, JSON
from sqlalchemy.orm import relationship
from ..db import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("providers.id"), nullable=False)
    
    # Service category for the booking (e.g., "Cleaning", "Cooking", "Repairs")
    service_category = Column(String(100), nullable=True)

    # Optional consumer location snapshot at request time
    consumer_lat = Column(Float, nullable=True)
    consumer_lng = Column(Float, nullable=True)

    # Provider live location during service (updated via API)
    provider_live_lat = Column(Float, nullable=True)
    provider_live_lng = Column(Float, nullable=True)

    # Dispatch queue for auto-assignment and decline → reassign flow
    # Stores ordered provider IDs considered for this booking, with current index
    dispatch_queue = Column(JSON, nullable=True)  # list[int]
    dispatch_idx = Column(Integer, default=0)

    # Status flow (strings are not strictly enforced to allow custom steps like on_the_way, arrived, started, completed)
    status = Column(String(32), default="requested")  # requested|accepted|declined|scheduled|completed|canceled|on_the_way|arrived|started
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(1000), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Rating data from consumer
    rating_stars = Column(Integer, nullable=True)  # 1..5
    rating_comment = Column(String(1000), nullable=True)
    rated_at = Column(DateTime(timezone=True), nullable=True)

    # Provider offer details
    eta_minutes = Column(Integer, nullable=True)  # ETA to arrival in minutes
    price_amount = Column(Float, nullable=True)   # e.g., 450.0
    price_currency = Column(String(8), nullable=True, default="INR")

    # Optional link back to originating forum issue (for fundraiser automation)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=True)

    # Crowdfunding fields
    funding_goal = Column(Float, default=1000.0)  # Default goal of 1000
    funding_current = Column(Float, default=0.0)  # Current amount funded
    funding_contributions = Column(JSON, nullable=True)  # List of contributions with user_id and amount
    auto_assign_enabled = Column(Integer, default=1)  # 1 = enabled, 0 = disabled
