# backend/app/models/provider.py
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from ..db import Base

class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bio = Column(String(500), default="")
    # skills stored as comma-separated tags; API accepts string or array and normalizes
    skills = Column(String(300), default="")
    rating = Column(Float, default=0.0)
    jobs_done = Column(Integer, default=0)
    # provider personal/location fields
    age = Column(Integer, nullable=True)
    address = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    active = Column(Boolean, default=True)
    radius_km = Column(Float, default=5.0)        # service radius
    fcm_token = Column(String(255), nullable=True)
    embedding = Column(JSON, nullable=True)  # vector for semantic matching (stored as JSON/text in SQLite)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="provider")

    @property
    def display_name(self) -> str:
        # Prefer linked user's name; fallback to a readable placeholder
        try:
            if getattr(self, "user", None) and getattr(self.user, "name", None):
                return self.user.name
        except Exception:
            pass
        return f"Helper #{self.id}"
