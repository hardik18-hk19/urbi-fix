# backend/app/services/fundraiser_service.py
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from ..models.fundraiser import Fundraiser, Contribution
from ..models.issue import Issue
from ..models.provider import Provider
from .provider_service import nearby_providers, haversine_km
from .booking_service import create_booking


def create_fundraiser(
    db: Session,
    *,
    issue_id: int,
    creator_user_id: int,
    target_amount: float,
    currency: str = "INR",
    upi_or_pay_url: Optional[str] = None,
    qr_image_url: Optional[str] = None,
) -> Fundraiser:
    # One active fundraiser per issue (guard)
    existing = db.query(Fundraiser).filter(Fundraiser.issue_id == issue_id, Fundraiser.active == True).first()
    if existing:
        return existing

    f = Fundraiser(
        issue_id=issue_id,
        creator_user_id=creator_user_id,
        target_amount=target_amount,
        collected_amount=0.0,
        currency=currency,
        upi_or_pay_url=upi_or_pay_url,
        qr_image_url=qr_image_url,
        active=True,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def add_contribution(
    db: Session,
    *,
    fundraiser_id: int,
    amount: float,
    currency: str = "INR",
    contributor_user_id: Optional[int] = None,
) -> tuple[Fundraiser, Contribution]:
    f = db.query(Fundraiser).get(fundraiser_id)
    if not f:
        raise ValueError("Fundraiser not found")

    # Enforce cap: do not allow contributions once goal is reached
    current = float(f.collected_amount or 0.0)
    target = float(f.target_amount or 0.0)
    if not getattr(f, 'active', True) or current >= target:
        raise ValueError("Fundraiser goal reached; no more contributions accepted")

    remaining = max(0.0, target - current)
    if float(amount) <= 0:
        raise ValueError("Contribution amount must be positive")
    if float(amount) > remaining:
        raise ValueError("Contribution exceeds remaining goal")

    c = Contribution(
        fundraiser_id=fundraiser_id,
        contributor_user_id=contributor_user_id,
        amount=amount,
        currency=currency,
    )
    db.add(c)

    # Update collected amount; close if target reached
    f.collected_amount = current + float(amount)
    if f.collected_amount >= target:
        f.active = False
        f.closed_at = datetime.utcnow()
        # Trigger auto-assignment of a provider via booking
        try_auto_assign_worker_for_issue(db, f.issue_id)

    db.commit()
    db.refresh(f)
    db.refresh(c)
    return f, c


def try_auto_assign_worker_for_issue(db: Session, issue_id: int):
    issue = db.query(Issue).get(issue_id)
    if not issue:
        return None
    # Only assign if we have location and classification
    lat, lng = issue.lat, issue.lng
    if lat is None or lng is None:
        return None

    # Determine category from AI to use as skill
    service_category = None
    ai = issue.ai if isinstance(issue.ai, dict) else None
    if ai:
        c = ai.get('classification')
        if isinstance(c, dict):
            service_category = c.get('category') or c.get('label')
        elif isinstance(c, str):
            service_category = c

    if not service_category:
        return None

    # Find nearby providers
    providers = nearby_providers(db, lat=lat, lng=lng, within_km=5.0, skill=service_category, query=None)
    if not providers:
        return None

    # Pick nearest
    providers.sort(key=lambda p: haversine_km(lat, lng, p.lat, p.lng))
    queue = [p.id for p in providers]
    provider_id = queue[0]

    # Create booking on behalf of the issue creator
    customer_id = issue.user_id or 0
    booking = create_booking(
        db,
        customer_id=customer_id,
        provider_id=provider_id,
        service_category=str(service_category),
        notes=f"Auto-assigned from fundraiser for issue #{issue_id}: {issue.title}",
        consumer_lat=lat,
        consumer_lng=lng,
        dispatch_queue=queue,
        dispatch_idx=0,
    )
    try:
        # Attach issue_id to the booking now that it's created
        from ..models.booking import Booking
        b = db.query(Booking).get(booking.id)
        if b:
            b.issue_id = issue_id
            db.commit()
            db.refresh(b)
    except Exception:
        db.rollback()
    # Mark issue as assigned
    try:
        issue.status = "assigned"
        db.commit()
        db.refresh(issue)
    except Exception:
        db.rollback()
    return booking