# backend/app/api/providers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..db import get_db
from ..models.user import User
from ..models.provider import Provider
from ..schemas.provider import ProviderCreate, ProviderUpdate, ProviderOut
from ..services.auth_service import get_current_user
from ..services.provider_service import nearby_providers
from ..ai.embeddings import EmbeddingsClient

router = APIRouter(prefix="/providers", tags=["Providers"])
_emb = EmbeddingsClient()

@router.post("", response_model=ProviderOut)
def register_provider(
    payload: ProviderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if db.query(Provider).filter(Provider.user_id == user.id).first():
        raise HTTPException(status_code=400, detail="Provider profile already exists")

    # Normalize skills to a comma-separated string if an array is provided
    skills_value = payload.skills
    if isinstance(skills_value, list):
        skills_value = ",".join([s.strip() for s in skills_value if s and s.strip()])
    elif isinstance(skills_value, str):
        skills_value = skills_value.strip()
    else:
        skills_value = ""

    p = Provider(
        user_id=user.id,
        bio=payload.bio or "",
        skills=skills_value or "",
        age=payload.age,
        address=payload.address,
        lat=payload.lat,
        lng=payload.lng,
        radius_km=payload.radius_km,
    )
    # Compute and store initial embedding
    p.embedding = _emb.encode(f"{p.skills or ''}. {p.bio or ''}")

    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.patch("/{provider_id}", response_model=ProviderOut)
def update_provider(provider_id: int, payload: ProviderUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(Provider).get(provider_id)
    if not p or p.user_id != user.id:
        raise HTTPException(status_code=404, detail="Provider not found")

    data = payload.dict(exclude_unset=True)
    # Normalize skills if provided as array
    if 'skills' in data:
        skills_value = data['skills']
        if isinstance(skills_value, list):
            data['skills'] = ",".join([s.strip() for s in skills_value if s and s.strip()])
        elif isinstance(skills_value, str):
            data['skills'] = skills_value.strip()
        else:
            data['skills'] = ""

    for k, v in data.items():
        setattr(p, k, v)

    # Recompute embedding if bio or skills changed
    if any(k in data for k in ("bio", "skills")):
        p.embedding = _emb.encode(f"{p.skills or ''}. {p.bio or ''}")

    db.commit()
    db.refresh(p)
    return p

@router.get("/nearby", response_model=List[ProviderOut])
def search_nearby(lat: float, lng: float, within_km: float = 5.0, skill: Optional[str] = None, query: Optional[str] = None, db: Session = Depends(get_db)):
    return nearby_providers(db, lat=lat, lng=lng, within_km=within_km, skill=skill, query=query)

@router.get("/me", response_model=ProviderOut)
def get_my_provider(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = db.query(Provider).filter(Provider.user_id == user.id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    return p
