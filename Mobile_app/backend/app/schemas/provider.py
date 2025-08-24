# backend/app/schemas/provider.py
from pydantic import BaseModel
from typing import Optional

class ProviderCreate(BaseModel):
    bio: Optional[str] = ""
    # accept either a string or a list for skills; normalize in API layer
    skills: Optional[str | list[str]] = ""
    age: Optional[int] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = 5.0

class ProviderUpdate(BaseModel):
    bio: Optional[str] = None
    skills: Optional[str | list[str]] = None
    age: Optional[int] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    active: Optional[bool] = None
    radius_km: Optional[float] = None
    fcm_token: Optional[str] = None

class ProviderOut(BaseModel):
    id: int
    user_id: int
    bio: str
    skills: str
    rating: float
    jobs_done: int
    age: int | None
    address: str | None
    lat: float | None
    lng: float | None
    active: bool
    radius_km: float
    display_name: str

    class Config:
        from_attributes = True
