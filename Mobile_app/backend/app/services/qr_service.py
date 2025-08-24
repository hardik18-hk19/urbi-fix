# backend/app/services/qr_service.py
from ..config import settings
import os

def generate_qr_placeholder(data: str) -> str:
    """Create a placeholder 'QR' as a text file under uploads and return its path.
    Replace with a real QR generator when needed.
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    path = os.path.join(settings.UPLOAD_DIR, f"qr_{os.urandom(4).hex()}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(data)
    return path