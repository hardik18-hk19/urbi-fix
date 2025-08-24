# backend/app/api/bookings.py
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Set

from ..db import get_db
from ..models.user import User
from ..models.provider import Provider
from ..models.booking import Booking
from ..schemas.booking import BookingCreate, BookingUpdateStatus, BookingOut, BookingAutoCreate, BookingLocationUpdate, BookingRatingCreate, BookingFundingContribution
from ..services.auth_service import get_current_user
from ..services.booking_service import create_booking, update_booking_status
from ..services.provider_service import nearby_providers, haversine_km

router = APIRouter(prefix="/bookings", tags=["Bookings"])

# Simple in-memory connection store for demo
_connections: Dict[int, Set[WebSocket]] = {}

async def _broadcast_status(booking: Booking):
    import json
    ws_set = _connections.get(booking.id)
    if not ws_set:
        return
    payload = BookingOut.from_orm(booking).model_dump()
    for ws in list(ws_set):
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            try:
                ws_set.remove(ws)
            except Exception:
                pass

@router.websocket("/ws/{booking_id}")
async def booking_ws(websocket: WebSocket, booking_id: int):
    await websocket.accept()
    ws_set = _connections.setdefault(booking_id, set())
    ws_set.add(websocket)
    try:
        # Immediately push current state if exists
        try:
            from ..db import SessionLocal
            db = SessionLocal()
            b = db.query(Booking).get(booking_id)
            if b:
                await _broadcast_status(b)
        except Exception:
            pass
        finally:
            try:
                db.close()
            except Exception:
                pass
        while True:
            # We don't expect messages from client; keep alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_set.discard(websocket)

@router.post("", response_model=BookingOut)
def create(payload: BookingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    provider = db.query(Provider).get(payload.provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    b = create_booking(
        db,
        customer_id=user.id,
        provider_id=provider.id,
        service_category=payload.service_category,
        scheduled_at=payload.scheduled_at,
        notes=payload.notes or "",
        consumer_lat=payload.consumer_lat,
        consumer_lng=payload.consumer_lng,
    )
    return b

@router.post("/auto", response_model=BookingOut)
def create_auto(payload: BookingAutoCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Find candidates by skill(category) and proximity
    candidates = nearby_providers(
        db,
        lat=payload.consumer_lat,
        lng=payload.consumer_lng,
        within_km=payload.within_km,
        skill=payload.service_category,
        query=None,
    )
    if not candidates:
        raise HTTPException(status_code=404, detail="No providers available nearby")

    # Order by distance (nearest first)
    candidates.sort(key=lambda p: haversine_km(payload.consumer_lat, payload.consumer_lng, p.lat, p.lng))
    queue = [p.id for p in candidates]
    provider_id = queue[0]

    b = create_booking(
        db,
        customer_id=user.id,
        provider_id=provider_id,
        service_category=payload.service_category,
        notes=payload.notes or "",
        consumer_lat=payload.consumer_lat,
        consumer_lng=payload.consumer_lng,
        dispatch_queue=queue,
        dispatch_idx=0,
    )
    return b

@router.get("", response_model=List[BookingOut])
def my_bookings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # If the user is a provider, show provider bookings; else show as customer
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    if provider:
        bookings = db.query(Booking).filter(Booking.provider_id == provider.id).order_by(Booking.id.desc()).all()
    else:
        bookings = db.query(Booking).filter(Booking.customer_id == user.id).order_by(Booking.id.desc()).all()
    
    # Enrich with provider information
    result = []
    for b in bookings:
        booking_provider = db.query(Provider).get(b.provider_id)
        provider_user = None
        if booking_provider:
            provider_user = db.query(User).get(booking_provider.user_id)
        
        booking_dict = {
            **b.__dict__,
            'provider_name': provider_user.name if provider_user else None,
            'provider_phone': provider_user.phone if provider_user else None,
            'provider_rating': booking_provider.rating if booking_provider else None,
        }
        result.append(BookingOut(**booking_dict))
    
    return result

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    b = db.query(Booking).get(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    is_customer = user.id == b.customer_id
    is_assigned_provider = bool(provider and provider.id == b.provider_id)
    if not (is_customer or is_assigned_provider):
        raise HTTPException(status_code=403, detail="Not allowed")
    
    # Get provider information
    booking_provider = db.query(Provider).get(b.provider_id)
    provider_user = None
    if booking_provider:
        provider_user = db.query(User).get(booking_provider.user_id)
    
    # Create response with provider info
    booking_dict = {
        **b.__dict__,
        'provider_name': provider_user.name if provider_user else None,
        'provider_phone': provider_user.phone if provider_user else None,
        'provider_rating': booking_provider.rating if booking_provider else None,
    }
    
    return BookingOut(**booking_dict)

@router.patch("/{booking_id}", response_model=BookingOut)
def update_status(booking_id: int, payload: BookingUpdateStatus, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    import anyio
    b = db.query(Booking).get(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only customer or current provider can change it
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    is_customer = user.id == b.customer_id
    is_assigned_provider = bool(provider and provider.id == b.provider_id)
    if not (is_customer or is_assigned_provider):
        raise HTTPException(status_code=403, detail="Not allowed")

    # Decline → try reassigning to the next provider in the dispatch queue
    if payload.status == "declined" and is_assigned_provider:
        queue = b.dispatch_queue or []
        idx = int(b.dispatch_idx or 0)
        next_idx = idx + 1
        reassigned = False
        while next_idx < len(queue):
            next_pid = queue[next_idx]
            # Ensure next provider still exists and is active
            next_p = db.query(Provider).get(next_pid)
            if next_p and next_p.active and next_p.lat is not None and next_p.lng is not None:
                b.provider_id = next_p.id
                b.status = "requested"
                b.dispatch_idx = next_idx
                # reset live location and previous offer when reassigning
                b.provider_live_lat = None
                b.provider_live_lng = None
                b.eta_minutes = None
                b.price_amount = None
                b.price_currency = None
                db.commit()
                db.refresh(b)
                reassigned = True
                break
            next_idx += 1
        if not reassigned:
            # No more providers to try; keep as declined (consumer may retry)
            b = update_booking_status(
                db,
                booking_id=booking_id,
                status="declined",
                scheduled_at=payload.scheduled_at,
            )
        # Broadcast and return
        try:
            anyio.from_thread.run(_broadcast_status, b)
        except Exception:
            pass
        return b

    # Normal status update path
    b = update_booking_status(
        db,
        booking_id=booking_id,
        status=payload.status,
        scheduled_at=payload.scheduled_at,
        eta_minutes=payload.eta_minutes,
        price_amount=payload.price_amount,
        price_currency=payload.price_currency,
    )

    # Fire-and-forget broadcast (don't block response if no listeners)
    try:
        anyio.from_thread.run(_broadcast_status, b)  # if called in thread context
    except Exception:
        # Fallback to direct await in async context isn't possible here; ignore if not available
        pass

    return b

@router.post("/{booking_id}/location", response_model=BookingOut)
def update_location(booking_id: int, payload: BookingLocationUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    import anyio
    b = db.query(Booking).get(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only assigned provider can update live location
    provider = db.query(Provider).filter(Provider.user_id == user.id).first()
    if not (provider and provider.id == b.provider_id):
        raise HTTPException(status_code=403, detail="Only assigned provider can update location")

    b.provider_live_lat = payload.lat
    b.provider_live_lng = payload.lng
    db.commit()
    db.refresh(b)

    # Broadcast new location via WS
    try:
        anyio.from_thread.run(_broadcast_status, b)
    except Exception:
        pass

    return b

@router.post("/{booking_id}/rating", response_model=BookingOut)
def rate_booking(booking_id: int, payload: BookingRatingCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    import anyio
    from datetime import datetime

    b = db.query(Booking).get(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only the customer who created the booking can rate
    if user.id != b.customer_id:
        raise HTTPException(status_code=403, detail="Only the booking customer can rate")

    # Allow rating only once and after completion
    if b.rating_stars is not None:
        raise HTTPException(status_code=400, detail="Booking already rated")
    if b.status != "completed":
        raise HTTPException(status_code=400, detail="Booking must be completed to rate")

    # Persist rating on booking
    b.rating_stars = payload.stars
    b.rating_comment = (payload.comment or "").strip() or None
    b.rated_at = datetime.utcnow()

    # Update provider aggregates
    provider = db.query(Provider).get(b.provider_id)
    if provider:
        # New average rating = ((old_avg * jobs_done) + stars) / (jobs_done + 1)
        new_jobs_done = int(provider.jobs_done or 0) + 1
        old_total = float(provider.rating or 0.0) * float(provider.jobs_done or 0)
        new_avg = (old_total + float(payload.stars)) / float(new_jobs_done)
        provider.jobs_done = new_jobs_done
        provider.rating = new_avg

    db.commit()
    db.refresh(b)

    # Broadcast update
    try:
        anyio.from_thread.run(_broadcast_status, b)
    except Exception:
        pass

    return b

@router.post("/{booking_id}/contribute", response_model=BookingOut)
def contribute_funding(booking_id: int, payload: BookingFundingContribution, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    import anyio
    from datetime import datetime

    b = db.query(Booking).get(booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Anyone can contribute to funding
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Contribution amount must be positive")

    # Enforce cap: prevent contributions once goal reached and prevent over-goal contributions
    current = float(b.funding_current or 0.0)
    goal = float(b.funding_goal or 0.0)
    if goal > 0 and current >= goal:
        raise HTTPException(status_code=400, detail="Funding goal already reached; no more contributions accepted")
    remaining = max(0.0, goal - current)
    if goal > 0 and float(payload.amount) > remaining:
        raise HTTPException(status_code=400, detail=f"Contribution exceeds remaining goal. Remaining: {remaining:.0f}")

    # Initialize contributions list if None
    if b.funding_contributions is None:
        b.funding_contributions = []

    # Add contribution
    contribution = {
        "user_id": user.id,
        "amount": payload.amount,
        "timestamp": datetime.utcnow().isoformat()
    }
    b.funding_contributions.append(contribution)
    b.funding_current = current + float(payload.amount)

    # Check if funding goal is reached and auto-assign is enabled
    funding_percentage = (b.funding_current / b.funding_goal) * 100 if b.funding_goal > 0 else 0
    
    if funding_percentage >= 100 and b.auto_assign_enabled and b.status == "requested":
        # Auto-assign to highest-rated provider
        candidates = nearby_providers(
            db,
            lat=b.consumer_lat or 0,
            lng=b.consumer_lng or 0,
            within_km=50,  # Expand search radius for auto-assignment
            skill=b.service_category,
            query=None,
        )
        
        if candidates:
            # Sort by rating (highest first), then by distance
            candidates.sort(key=lambda p: (-float(p.rating or 0), haversine_km(b.consumer_lat or 0, b.consumer_lng or 0, p.lat, p.lng)))
            best_provider = candidates[0]
            
            # Update booking to assign to best provider
            b.provider_id = best_provider.id
            b.status = "auto_assigned"  # New status to indicate auto-assignment
            
            # Clear any existing dispatch queue since this is auto-assigned
            b.dispatch_queue = [best_provider.id]
            b.dispatch_idx = 0

    db.commit()
    db.refresh(b)

    # Broadcast update
    try:
        anyio.from_thread.run(_broadcast_status, b)
    except Exception:
        pass

    return b
