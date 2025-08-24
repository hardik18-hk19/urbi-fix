# backend/app/api/fundraisers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..models.user import User
from ..models.issue import Issue
from ..models.fundraiser import Fundraiser, Contribution
from ..schemas.fundraiser import (
    FundraiserCreate, FundraiserOut,
    ContributionCreate, ContributionOut,
)
from ..services.auth_service import get_current_user
from ..services.fundraiser_service import (
    create_fundraiser, add_contribution,
)

from ..config import settings
import os

router = APIRouter(prefix="/fundraisers", tags=["Fundraisers"])


def _generate_qr_image(data: str) -> str:
    """Generate a QR image (PNG). Falls back to a text file if QR lib unavailable.
    Returns a public URL under /uploads for frontend consumption.
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Try to generate real QR PNG
    try:
        import qrcode  # type: ignore
        filename = f"qr_{os.urandom(4).hex()}.png"
        path = os.path.join(settings.UPLOAD_DIR, filename)
        img = qrcode.make(data)
        img.save(path)
        return f"/uploads/{filename}"
    except Exception:
        # Fallback: write plain text for visibility in dev
        filename = f"qr_{os.urandom(4).hex()}.txt"
        path = os.path.join(settings.UPLOAD_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(data)
        return f"/uploads/{filename}"


@router.post("", response_model=FundraiserOut)
def start_fundraiser(payload: FundraiserCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    issue = db.query(Issue).get(payload.issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    # Permission: Any authenticated user may start a fundraiser for an issue
    # (previously restricted to issue creator)
    # if issue.user_id and issue.user_id != user.id:
    #     raise HTTPException(status_code=403, detail="Only the issue creator can start fundraiser")

    qr_data = payload.upi_or_pay_url or f"upi://pay?pa=demo@upi&am={payload.target_amount}&cu={payload.currency}&tn=Issue%20{payload.issue_id}"
    qr_image_url = _generate_qr_image(qr_data)

    f = create_fundraiser(
        db,
        issue_id=payload.issue_id,
        creator_user_id=user.id,
        target_amount=payload.target_amount,
        currency=payload.currency,
        upi_or_pay_url=payload.upi_or_pay_url or qr_data,
        qr_image_url=qr_image_url,
    )

    # Auto-post to forum about the fundraiser
    try:
        from .forum import create_post_internal
        # Compute totals
        collected = float(getattr(f, 'collected_amount', 0.0) or 0.0)
        target = float(getattr(f, 'target_amount', 0.0) or 0.0)
        percent = 0 if target <= 0 else int((collected / target) * 100)
        title = f"Fundraiser started for Issue #{f.issue_id}"
        content = (
            f"A fundraiser has been started for issue #{f.issue_id}.\n"
            f"Target: {f.currency} {target:.0f}\n"
            f"Raised so far: {f.currency} {collected:.0f} ({percent}% of target)\n"
            f"Payment link/UPI: {f.upi_or_pay_url}\n"
            f"QR: {f.qr_image_url}"
        )
        create_post_internal(
            db=db,
            title=title,
            content=content,
            category="fundraiser",
            author_name=user.name,
            issue_id=f.issue_id,
            fundraiser_id=f.id,
        )
    except Exception:
        # Non-fatal: forum posting is best-effort
        pass

    return f


@router.get("/{issue_id}", response_model=List[FundraiserOut])
def list_issue_fundraisers(issue_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Fundraiser).filter(Fundraiser.issue_id == issue_id).order_by(Fundraiser.id.desc()).all()


@router.post("/{fundraiser_id}/contributions", response_model=ContributionOut)
def contribute(fundraiser_id: int, payload: ContributionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # contributor_user_id in payload is optional; if omitted, tie to current user
    contributor_id = payload.contributor_user_id or user.id
    try:
        f, c = add_contribution(
            db,
            fundraiser_id=fundraiser_id,
            amount=payload.amount,
            currency=payload.currency,
            contributor_user_id=contributor_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Auto-post an update to the forum with totals
    try:
        from .forum import create_post_internal
        collected = float(getattr(f, 'collected_amount', 0.0) or 0.0)
        target = float(getattr(f, 'target_amount', 0.0) or 0.0)
        percent = 0 if target <= 0 else int((collected / target) * 100)
        title = f"Fundraiser update for Issue #{f.issue_id}"
        status_line = "Goal reached! Fundraiser closed." if not getattr(f, 'active', True) else "In progress"
        status_suffix = f"\n{status_line}" if status_line else ""
        content = (
            f"New contribution: {c.currency} {c.amount:.0f}\n"
            f"Total raised: {f.currency} {collected:.0f} / {f.currency} {target:.0f} ({percent}%)"
            f"{status_suffix}"
        )
        create_post_internal(
            db=db,
            title=title,
            content=content,
            category="fundraiser",
            author_name="system",
            issue_id=f.issue_id,
            fundraiser_id=f.id,
        )
    except Exception:
        pass

    return c


@router.get("/{fundraiser_id}/summary", response_model=FundraiserOut)
def get_summary(fundraiser_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    f = db.query(Fundraiser).get(fundraiser_id)
    if not f:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    return f