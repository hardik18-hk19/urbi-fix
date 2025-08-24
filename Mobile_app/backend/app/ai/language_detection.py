# backend/app/ai/language_detection.py
from langdetect import detect, DetectorFactory
from typing import Optional
DetectorFactory.seed = 0

class LanguageDetector:
    def detect(self, text: str) -> Optional[str]:
        """
        Return ISO language code (e.g., 'en', 'hi', 'mr') or None.
        """
        if not text or not text.strip():
            return None
        try:
            return detect(text)
        except Exception:
            return None
