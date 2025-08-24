# backend/app/services/notify_service.py
from typing import Optional

# Default mapping kept for reference; we override the destination below
CATEGORY_TO_OFFICIAL = {
    'electricity': 'electricity@city.gov',
    'road': 'roads@city.gov',
    'water': 'water@city.gov',
    'garbage': 'sanitation@city.gov',
}

# Hard-routed recipient (log-only mode)
OVERRIDE_EMAIL = 'rishikarishika0212@gmail.com'


def notify_officials(category: str | dict | None, payload: dict) -> dict:
    """Log-only notifier that routes all messages to OVERRIDE_EMAIL.
    Replace with SMTP/webhook integration for real delivery.
    """
    # Normalize category to string (optional/meta)
    if isinstance(category, dict):
        cat_str = category.get("category") or category.get("label")
    else:
        cat_str = category

    target = OVERRIDE_EMAIL

    subject = payload.get('subject') or f"Community Complaint - {payload.get('title')}"
    body = payload.get('body') or payload.get('description') or ''

    # Here you'd send the email/webhook. For now, return a structured log.
    return {
        "notified": True,
        "target": target,
        "category": cat_str,
        "subject": subject,
        "body_preview": body[:200],
        "meta": {k: payload.get(k) for k in ['issue_id', 'title', 'user', 'contact'] if k in payload},
    }