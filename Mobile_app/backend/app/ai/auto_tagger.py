from typing import Optional, Dict, Any, List
from .language_detection import LanguageDetector
from .translation import SimpleTranslator
from .keyword_extraction import KeywordExtractor
from .image_analysis import ImageAnalyzer
from .llm_client import LLMClient
from .utils import DEFAULT_TAXONOMY

class AutoTagger:
    def __init__(self, taxonomy: Optional[List[str]] = None):
        self.lang = LanguageDetector()
        self.translator = SimpleTranslator()
        self.kw = KeywordExtractor()
        self.img = ImageAnalyzer()
        self.taxonomy = taxonomy or DEFAULT_TAXONOMY
        self.llm = LLMClient(self.taxonomy)

    def analyze(self, text: Optional[str] = None, file_bytes: Optional[bytes] = None) -> Dict[str, Any]:
        detected_lang = self.lang.detect(text) if text else None

        text_en = text
        if text and detected_lang and detected_lang != "en":
            text_en = self.translator.translate(text) or text

        keywords = self.kw.extract(text_en or "")

        image_labels = []
        if file_bytes:
            image_preds = self.img.classify(file_bytes, top_k=5)
            image_labels = [p["label"] for p in image_preds if p.get("score", 0) > 0.05]

        classification = self.llm.classify(text_en or "")

        return {
            "detected_language": detected_lang,
            "text_en": text_en,
            "keywords": keywords,
            "image_labels": image_labels,
            "classification": classification
        }

    def classify_text(self, text: str) -> Dict[str, Any]:
        """Wrapper for backward compatibility with API calls."""
        return self.analyze(text=text)
