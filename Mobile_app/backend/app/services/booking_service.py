# backend/app/services/booking_service.py
from sqlalchemy.orm import Session
from typing import Optional, Sequence
from ..models.booking import Booking


def create_booking(
    db: Session,
    *,
    customer_id: int,
    provider_id: int,
    service_category: Optional[str] = None,
    scheduled_at=None,
    notes: str = "",
    consumer_lat: Optional[float] = None,
    consumer_lng: Optional[float] = None,
    dispatch_queue: Optional[Sequence[int]] = None,
    dispatch_idx: int = 0,
) -> Booking:
    b = Booking(
        customer_id=customer_id,
        provider_id=provider_id,
        service_category=service_category,
        scheduled_at=scheduled_at,
        notes=notes,
        consumer_lat=consumer_lat,
        consumer_lng=consumer_lng,
        dispatch_queue=list(dispatch_queue) if dispatch_queue else None,
        dispatch_idx=dispatch_idx,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def update_booking_status(
    db: Session,
    *,
    booking_id: int,
    status: str,
    scheduled_at=None,
    eta_minutes: int | None = None,
    price_amount: float | None = None,
    price_currency: str | None = None,
) -> Booking:
    b = db.query(Booking).get(booking_id)
    if not b:
        raise ValueError("Booking not found")
    b.status = status
    if scheduled_at:
        b.scheduled_at = scheduled_at
    # Persist optional provider offer details if provided
    if eta_minutes is not None:
        b.eta_minutes = int(eta_minutes)
    if price_amount is not None:
        b.price_amount = float(price_amount)
    if price_currency is not None and price_currency.strip():
        b.price_currency = price_currency.strip().upper()
    db.commit()
    db.refresh(b)
    return b
