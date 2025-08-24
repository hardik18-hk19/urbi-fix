# backend/app/api/issues.py
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from datetime import datetime

from ..db import get_db
from ..models.issue import Issue
from ..models.user import User
from ..schemas.issue import IssueCreate, IssueOut, ComplaintEscalateRequest, EmailComposeResponse, OfficialStatusUpdate
from ..services.auth_service import get_current_user
from ..services.issue_service import save_upload, create_issue
from ..services.notify_service import notify_officials

# Lazy-load AI pipeline to avoid heavy imports at module import time (helps with reload on Windows)
_autotagger = None

def get_autotagger():
    global _autotagger
    if _autotagger is not None:
        return _autotagger
    try:
        from ..ai.auto_tagger import AutoTagger
        _autotagger = AutoTagger()
    except Exception:
        _autotagger = None  # fallback if AI stack isn't ready
    return _autotagger

router = APIRouter(prefix="/issues", tags=["Issues"])


def _build_complaint_draft(user: User, issue: Issue, category: str | dict | None) -> tuple[str, str | None]:
    # Normalize category to a clean string and map to target
    if isinstance(category, dict):
        cat_str = category.get("category") or category.get("label") or category.get("classification")
    else:
        cat_str = category
    cat_clean = (str(cat_str).strip().lower() if cat_str else None)

    to_map = {
        'water': 'Municipal Water Department',
        'electricity': 'Electricity Board',
        'road': 'Roads & Transport Department',
        'garbage': 'Sanitation Department',
    }
    dept_name = to_map.get(cat_clean) if cat_clean else None

    location_lines = []
    if issue.lat is not None and issue.lng is not None:
        # Include coordinates and a Google Maps link for easy reference
        location_lines.append(f"Location: Coordinates: {issue.lat:.5f}, {issue.lng:.5f}")
        location_lines.append(f"Map: https://maps.google.com/?q={issue.lat:.6f},{issue.lng:.6f}")

    user_contact = f"Contact: {user.phone or 'N/A'}"
    location_block = ("\n".join(location_lines) + "\n") if location_lines else ""

    draft = (
        f"To: {dept_name or 'Concerned Department'}\n"
        f"Subject: Urgent Complaint - {issue.title}\n\n"
        "Respected Sir/Madam,\n\n"
        f"I would like to bring to your attention the following issue: {issue.description}\n"
        f"{location_block}"
        "This has been causing inconvenience to residents in the area.\n"
        "Kindly take urgent action to resolve this matter.\n\n"
        "Thank you,\n"
        f"{user.name}\n"
        f"{user_contact}\n"
    )
    return draft, dept_name

@router.post("", response_model=IssueOut)
def create_issue_json(
    payload: IssueCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ai_res = None
    if payload.analyze:
        autotagger = get_autotagger()
        if autotagger:
            ai_res = autotagger.classify_text(payload.description)

    # Moderation: block gibberish + profanity before posting (title + description)
    from ..services.gibberish_detector import assess_text as _assess
    from ..services.profanity_filter import check_profanity as _check_prof
    # Check title
    t_gib = _assess(payload.title)
    if t_gib.get('is_gibberish'):
        raise HTTPException(status_code=400, detail={
            'message': 'Title looks like gibberish. Please provide a meaningful title.',
            'reasons': t_gib.get('reasons', []),
        })
    t_prof = _check_prof(payload.title)
    if t_prof.get('has_profanity'):
        raise HTTPException(status_code=400, detail={
            'message': 'Title contains offensive language. Please edit and try again.',
            'matches': t_prof.get('matches', []),
        })
    # Check description
    gib = _assess(payload.description)
    if gib.get('is_gibberish'):
        raise HTTPException(status_code=400, detail={
            'message': 'Description looks like gibberish. Please provide meaningful details.',
            'reasons': gib.get('reasons', []),
        })
    prof = _check_prof(payload.description)
    if prof.get('has_profanity'):
        raise HTTPException(status_code=400, detail={
            'message': 'Description contains offensive language. Please edit and try again.',
            'matches': prof.get('matches', []),
        })

    issue = create_issue(
        db, user_id=user.id,
        title=payload.title, description=payload.description,
        lat=payload.lat, lng=payload.lng,
        image_url=None, ai=ai_res
    )

    # If government-related category, prepare complaint draft
    gov_categories = {"water", "electricity", "road", "garbage"}
    classification = None
    if ai_res:
        c = ai_res.get('classification')
        if isinstance(c, dict):
            classification = c.get('category') or c.get('label')
        else:
            classification = c
    if classification and str(classification).lower() in gov_categories:
        draft, dept_name = _build_complaint_draft(user, issue, classification)
        issue.complaint_draft = draft
        db.add(issue)
        db.commit()
        db.refresh(issue)

    # Notify officials stub (existing behavior)
    if ai_res and ai_res.get('classification'):
        notify_officials(ai_res['classification'], {
            'issue_id': issue.id,
            'title': payload.title,
            'description': payload.description
        })

    return issue

@router.post("/with-image", response_model=IssueOut)
def create_issue_with_image(
    title: str = Form(...),
    description: str = Form(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    analyze: bool = Form(True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    path = save_upload(file)
    ai_res = None
    if analyze:
        autotagger = get_autotagger()
        if autotagger:
            # Your AutoTagger can have an image+text method; adapt as needed
            try:
                ai_res = autotagger.classify_text_with_image(description, path)
            except Exception:
                ai_res = autotagger.classify_text(description)

    # Moderation: block gibberish + profanity before posting (image variant)
    from ..services.gibberish_detector import assess_text as _assess
    from ..services.profanity_filter import check_profanity as _check_prof
    # Title comes from form 'title' in this endpoint signature
    t_gib = _assess(title)
    if t_gib.get('is_gibberish'):
        raise HTTPException(status_code=400, detail={
            'message': 'Title looks like gibberish. Please provide a meaningful title.',
            'reasons': t_gib.get('reasons', []),
        })
    t_prof = _check_prof(title)
    if t_prof.get('has_profanity'):
        raise HTTPException(status_code=400, detail={
            'message': 'Title contains offensive language. Please edit and try again.',
            'matches': t_prof.get('matches', []),
        })
    gib = _assess(description)
    if gib.get('is_gibberish'):
        raise HTTPException(status_code=400, detail={
            'message': 'Description looks like gibberish. Please provide meaningful details.',
            'reasons': gib.get('reasons', []),
        })
    prof = _check_prof(description)
    if prof.get('has_profanity'):
        raise HTTPException(status_code=400, detail={
            'message': 'Description contains offensive language. Please edit and try again.',
            'matches': prof.get('matches', []),
        })

    issue = create_issue(
        db, user_id=user.id,
        title=title, description=description,
        lat=lat, lng=lng,
        image_url=path, ai=ai_res
    )

    # If government-related category, prepare complaint draft
    gov_categories = {"water", "electricity", "road", "garbage"}
    classification = None
    if ai_res:
        c = ai_res.get('classification')
        if isinstance(c, dict):
            classification = c.get('category') or c.get('label')
        else:
            classification = c
    if classification and str(classification).lower() in gov_categories:
        draft, dept_name = _build_complaint_draft(user, issue, classification)
        issue.complaint_draft = draft
        db.add(issue)
        db.commit()
        db.refresh(issue)

    # Notify officials stub (existing behavior)
    if ai_res and ai_res.get('classification'):
        notify_officials(ai_res['classification'], {
            'issue_id': issue.id,
            'title': title,
            'description': description
        })

    return issue

@router.post("/{issue_id}/escalate", response_model=IssueOut)
def escalate_issue(
    issue_id: int,
    payload: ComplaintEscalateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    # Allow admin or issue creator to escalate
    if user.role != 'admin' and issue.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Determine category and target
    classification = None
    ai = issue.ai or {}
    c = ai.get('classification') if isinstance(ai, dict) else None
    if isinstance(c, dict):
        classification = c.get('category') or c.get('label')
    elif isinstance(c, str):
        classification = c

    draft_text = payload.draft or issue.complaint_draft
    if not draft_text:
        # Build a fresh draft if not present
        draft_text, dept_name = _build_complaint_draft(user, issue, classification)
    else:
        dept_name = None
        if classification:
            # Map department again for record
            dept_map = {
                'water': 'Municipal Water Department',
                'electricity': 'Electricity Board',
                'road': 'Roads & Transport Department',
                'garbage': 'Sanitation Department',
            }
            dept_name = dept_map.get(str(classification).lower())

    # Guard: gibberish detection
    from ..services.gibberish_detector import assess_text
    assessment = assess_text(draft_text)
    if assessment.get('is_gibberish'):
        raise HTTPException(
            status_code=400,
            detail={
                'message': 'Draft looks like gibberish. Please provide more meaningful details before sending.',
                'reasons': assessment.get('reasons', []),
            }
        )

    # Moderation: block gibberish + profanity before sending
    from ..services.gibberish_detector import assess_text as _assess
    from ..services.profanity_filter import check_profanity as _check_prof
    gib = _assess(draft_text)
    if gib.get('is_gibberish'):
        raise HTTPException(
            status_code=400,
            detail={
                'message': 'Draft looks like gibberish. Please provide more meaningful details before sending.',
                'reasons': gib.get('reasons', []),
            }
        )
    prof = _check_prof(draft_text)
    if prof.get('has_profanity'):
        raise HTTPException(
            status_code=400,
            detail={
                'message': 'Draft contains offensive language. Please edit and try again.',
                'matches': prof.get('matches', []),
            }
        )

    # Send via notifier (log-only) and capture target
    from ..services.notify_service import notify_officials
    notify = notify_officials(classification, {
        'issue_id': issue.id,
        'title': issue.title,
        'description': issue.description,
        'subject': f"Community Complaint - {issue.title}",
        'body': draft_text,
        'user': getattr(user, 'name', None),
        'contact': getattr(user, 'phone', None),
    })
    target_email = (notify or {}).get('target')

    # Mark as escalated and store draft
    issue.complaint_draft = draft_text
    issue.escalated = True
    issue.escalated_to = target_email or dept_name or 'Concerned Department'
    issue.escalated_at = datetime.utcnow()
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Auto-enable: create a demo fundraiser with a default target and QR placeholder
    try:
        from ..services.fundraiser_service import create_fundraiser
        from ..services.qr_service import generate_qr_placeholder
        qr_data = f"upi://pay?pa=demo@upi&am=1000&cu=INR&tn=Issue%20{issue.id}"
        qr_path = generate_qr_placeholder(qr_data)
        create_fundraiser(
            db,
            issue_id=issue.id,
            creator_user_id=user.id,
            target_amount=1000.0,
            currency="INR",
            upi_or_pay_url=qr_data,
            qr_image_url=qr_path,
        )
    except Exception:
        # Best-effort; do not break escalation if fundraiser fails
        pass

    return issue

@router.post("/{issue_id}/compose-email", response_model=EmailComposeResponse)
def compose_issue_email(
    issue_id: int,
    payload: ComplaintEscalateRequest | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    # Only the issue creator can compose (no real sending in dev)
    if issue.user_id and issue.user_id != user.id:
        raise HTTPException(status_code=403, detail="Only the issue creator can compose the email")

    # Determine classification
    classification = None
    ai = issue.ai or {}
    c = ai.get('classification') if isinstance(ai, dict) else None
    if isinstance(c, dict):
        classification = c.get('category') or c.get('label')
    elif isinstance(c, str):
        classification = c

    # Use provided draft or build
    draft_text = payload.draft if (payload and payload.draft) else issue.complaint_draft
    if not draft_text:
        draft_text, _ = _build_complaint_draft(user, issue, classification)

    # Resolve recipient based on category (demo-only addresses)
    from ..services.notify_service import CATEGORY_TO_OFFICIAL
    recipient = "info@city.gov"
    if classification:
        recipient = CATEGORY_TO_OFFICIAL.get(str(classification).lower(), recipient)

    subject = f"Community Complaint - {issue.title}"
    body = draft_text

    # Build a mailto link for the client to open email composer
    from urllib.parse import quote
    mailto = f"mailto:{recipient}?subject={quote(subject)}&body={quote(body)}"

    return EmailComposeResponse(recipient=recipient, subject=subject, body=body, mailto=mailto)

@router.post("/{issue_id}/official-status", response_model=IssueOut)
def update_official_status(issue_id: int, payload: OfficialStatusUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    # Allow admin or issue creator to mark status
    if user.role != 'admin' and issue.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    issue.official_status = payload.status
    from datetime import datetime
    issue.official_response_at = datetime.utcnow()
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue

@router.delete("/{issue_id}")
def delete_issue(issue_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if user.role != 'admin' and issue.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(issue)
    db.commit()
    return {"deleted": True}

@router.get("", response_model=list[IssueOut])
def list_issues(sort: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Issue)

    def ensure_draft(it: Issue):
        # Build a generic draft if missing so UI has something to prefill
        if not getattr(it, 'complaint_draft', None):
            classification = None
            ai = it.ai if isinstance(it.ai, dict) else None
            if ai:
                c = ai.get('classification')
                if isinstance(c, dict):
                    classification = c.get('category') or c.get('label')
                elif isinstance(c, str):
                    classification = c
            draft, _ = _build_complaint_draft(user, it, classification)
            it.complaint_draft = draft
        return it
    
    if sort == "trending":
        # Import votes from votes router (simple in-memory for now)
        from ..api.votes import _votes
        issues = query.all()
        issues = [ensure_draft(i) for i in issues]
        # Sort by vote score (descending)
        issues.sort(key=lambda i: _votes.get(i.id, 0), reverse=True)
        return issues
    else:
        issues = query.order_by(Issue.id.desc()).all()
        issues = [ensure_draft(i) for i in issues]
        return issues

@router.post("/{issue_id}/contribute")
def contribute_funding(issue_id: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from ..models.booking import Booking
    from ..services.provider_service import nearby_providers, haversine_km
    
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Anyone can contribute to funding
    amount = payload.get('amount', 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Contribution amount must be positive")

    # Enforce cap: prevent contributions once goal reached and prevent over-goal contributions
    current = float(issue.funding_current or 0.0)
    goal = float(issue.funding_goal or 0.0)
    if goal > 0 and current >= goal:
        raise HTTPException(status_code=400, detail="Funding goal already reached; no more contributions accepted")
    remaining = max(0.0, goal - current)
    if goal > 0 and float(amount) > remaining:
        raise HTTPException(status_code=400, detail=f"Contribution exceeds remaining goal. Remaining: {remaining:.0f}")

    # Initialize contributions list if None
    if issue.funding_contributions is None:
        issue.funding_contributions = []

    # Add contribution
    contribution = {
        "user_id": user.id,
        "amount": amount,
        "timestamp": datetime.utcnow().isoformat()
    }
    issue.funding_contributions.append(contribution)
    issue.funding_current = current + float(amount)

    # Check if funding goal is reached and auto-assign is enabled
    funding_percentage = (issue.funding_current / issue.funding_goal) * 100 if issue.funding_goal > 0 else 0
    
    if funding_percentage >= 100 and issue.auto_assign_enabled and not issue.assigned_booking_id:
        # Create a booking automatically when funding is complete
        # Extract service category from AI classification or use default
        service_category = "General Help"
        if issue.ai and isinstance(issue.ai, dict):
            classification = issue.ai.get('classification')
            if isinstance(classification, dict):
                service_category = classification.get('category', 'General Help')
            elif isinstance(classification, str):
                service_category = classification

        # Create booking
        booking = Booking(
            customer_id=issue.user_id or user.id,  # Use issue creator or contributor as customer
            provider_id=1,  # Temporary, will be updated with auto-assignment
            service_category=service_category,
            consumer_lat=issue.lat,
            consumer_lng=issue.lng,
            notes=f"Auto-created from forum post: {issue.title}",
            status="requested",
            issue_id=issue.id,
            funding_goal=issue.funding_goal,
            funding_current=issue.funding_current,
            funding_contributions=issue.funding_contributions,
            auto_assign_enabled=1
        )
        db.add(booking)
        db.flush()  # Get the booking ID

        # Auto-assign to highest-rated provider
        if issue.lat and issue.lng:
            candidates = nearby_providers(
                db,
                lat=issue.lat,
                lng=issue.lng,
                within_km=50,  # Expand search radius for auto-assignment
                skill=service_category,
                query=None,
            )
            
            if candidates:
                # Sort by rating (highest first), then by distance
                candidates.sort(key=lambda p: (-float(p.rating or 0), haversine_km(issue.lat, issue.lng, p.lat, p.lng)))
                best_provider = candidates[0]
                
                # Update booking to assign to best provider
                booking.provider_id = best_provider.id
                booking.status = "auto_assigned"  # New status to indicate auto-assignment
                
                # Clear any existing dispatch queue since this is auto-assigned
                booking.dispatch_queue = [best_provider.id]
                booking.dispatch_idx = 0

        # Link the booking to the issue
        issue.assigned_booking_id = booking.id

    db.commit()
    db.refresh(issue)

    return {
        "message": "Contribution successful",
        "issue": issue,
        "funding_percentage": funding_percentage,
        "auto_assigned": funding_percentage >= 100 and issue.assigned_booking_id is not None
    }

@router.get("/{issue_id}", response_model=IssueOut)
def get_issue(issue_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Build a generic draft if missing so UI has something to prefill
    if not getattr(issue, 'complaint_draft', None):
        classification = None
        ai = issue.ai if isinstance(issue.ai, dict) else None
        if ai:
            c = ai.get('classification')
            if isinstance(c, dict):
                classification = c.get('category') or c.get('label')
            elif isinstance(c, str):
                classification = c
        draft, _ = _build_complaint_draft(user, issue, classification)
        issue.complaint_draft = draft
    
    return issue
