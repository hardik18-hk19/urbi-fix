# backend/app/models/issue.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Boolean, func
from sqlalchemy.orm import relationship
from ..db import Base

class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    status = Column(String(32), default="open")  # open|assigned|in_progress|done|closed
    image_url = Column(String(300), nullable=True)
    ai = Column(JSON, nullable=True)
    # Chatbot complaint drafting + escalation metadata
    complaint_draft = Column(String(4000), nullable=True)
    escalated = Column(Boolean, default=False)
    escalated_to = Column(String(255), nullable=True)
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    # Track official response from authorities
    official_status = Column(String(64), nullable=True)  # e.g., acknowledged|in_progress|resolved|rejected
    official_response_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Crowdfunding fields for forum posts with QR codes
    funding_goal = Column(Float, default=1000.0)  # Default goal of 1000
    funding_current = Column(Float, default=0.0)  # Current amount funded
    funding_contributions = Column(JSON, nullable=True)  # List of contributions with user_id and amount
    auto_assign_enabled = Column(Integer, default=1)  # 1 = enabled, 0 = disabled
    assigned_booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)  # Link to created booking when funded
