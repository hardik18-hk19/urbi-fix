# backend/app/ai/keyword_extraction.py
from typing import List
import yake

class KeywordExtractor:
    """
    Extracts keywords using YAKE. Configure max_keywords via constructor.
    """
    def __init__(self, max_keywords:int = 8, lang: str = "en"):
        self.max_keywords = max_keywords
        self.lang = lang
        self._extractor = yake.KeywordExtractor(lan=self.lang, n=2, top=self.max_keywords)

    def extract(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []
        try:
            kws = self._extractor.extract_keywords(text)
            # kw format: (keyword, score) with lower score = more important
            return [kw for kw, _ in kws]
        except Exception:
            return []
