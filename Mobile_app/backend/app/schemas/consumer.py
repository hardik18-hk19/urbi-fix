# backend/app/schemas/consumer.py
from pydantic import BaseModel
from typing import Optional

class ConsumerCreate(BaseModel):
    age: Optional[int] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class ConsumerOut(BaseModel):
    id: int
    user_id: int
    age: int | None
    phone: str | None
    address: str | None
    lat: float | None
    lng: float | None

    class Config:
        from_attributes = True