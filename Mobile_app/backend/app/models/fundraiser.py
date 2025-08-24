# backend/app/models/fundraiser.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from ..db import Base

class Fundraiser(Base):
    __tablename__ = "fundraisers"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False, index=True)
    creator_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    target_amount = Column(Float, nullable=False)
    collected_amount = Column(Float, default=0.0)
    currency = Column(String(8), default="INR")

    upi_or_pay_url = Column(String(500), nullable=True)  # UPI/PayPal/etc.
    qr_image_url = Column(String(500), nullable=True)

    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    issue = relationship("Issue")

class Contribution(Base):
    __tablename__ = "contributions"

    id = Column(Integer, primary_key=True, index=True)
    fundraiser_id = Column(Integer, ForeignKey("fundraisers.id"), nullable=False, index=True)
    contributor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="INR")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fundraiser = relationship("Fundraiser")