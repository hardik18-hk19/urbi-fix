# backend/app/services/provider_service.py
from math import radians, sin, cos, asin, sqrt
from sqlalchemy.orm import Session
from typing import List, Optional
import math
from ..models.provider import Provider
from ..ai.embeddings import EmbeddingsClient

# Reusable embedding client
_emb_client = EmbeddingsClient()

def haversine_km(lat1, lon1, lat2, lon2):
    # Earth radius in KM
    R = 6371.0
    dlat = radians((lat2 or 0) - (lat1 or 0))
    dlon = radians((lon2 or 0) - (lon1 or 0))
    a = sin(dlat/2)**2 + cos(radians(lat1 or 0)) * cos(radians(lat2 or 0)) * sin(dlon/2)**2
    return 2 * R * asin(sqrt(a))

def _has_skill(provider: Provider, skill: str) -> bool:
    if not skill:
        return True
    # case-insensitive substring match within comma-separated skills
    skills_str = (provider.skills or "").lower()
    return skill.lower() in skills_str

def _cosine(a: list[float] | None, b: list[float] | None) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0

def _ensure_provider_embedding(db: Session, p: Provider) -> list[float]:
    if getattr(p, "embedding", None):
        return p.embedding  # type: ignore
    text = f"{p.skills or ''}. {p.bio or ''}"
    emb = _emb_client.encode(text)
    p.embedding = emb  # type: ignore
    try:
        db.add(p)
        db.commit()
        db.refresh(p)
    except Exception:
        db.rollback()
    return emb


def nearby_providers(db: Session, lat: float, lng: float, within_km: float = 5.0,
                     skill: Optional[str] = None, query: Optional[str] = None) -> List[Provider]:
    q = db.query(Provider).filter(Provider.active == True, Provider.lat.isnot(None), Provider.lng.isnot(None))
    candidates: List[Provider] = []
    for p in q.all():
        if not _has_skill(p, skill or ""):
            continue
        dist = haversine_km(lat, lng, p.lat, p.lng)
        if dist <= max(p.radius_km or within_km, within_km):
            candidates.append(p)

    if not query:
        return candidates

    q_vec = _emb_client.encode(query)
    scored = []
    for p in candidates:
        p_vec = _ensure_provider_embedding(db, p)
        score = _cosine(q_vec, p_vec)
        scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored]
