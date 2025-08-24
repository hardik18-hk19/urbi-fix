# backend/app/models/forum_post.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from ..db import Base

class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(String(4000), nullable=False)
    category = Column(String(64), default="general", index=True)

    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(120), nullable=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # optional linkage to issues/fundraisers
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=True, index=True)
    fundraiser_id = Column(Integer, ForeignKey("fundraisers.id"), nullable=True, index=True)

    issue = relationship("Issue")
    fundraiser = relationship("Fundraiser")