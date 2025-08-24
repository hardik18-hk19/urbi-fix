# backend/app/ai/llm_client.py
from typing import Dict, Any, List
from .utils import env
from transformers import pipeline

class LLMClient:
    def __init__(self, taxonomy: List[str]):       
        self.taxonomy = taxonomy
        model_name = env("HF_LLM_MODEL", "facebook/bart-large-mnli")
        # "bart-large-mnli" supports zero-shot classification without fine-tuning
        self.pipe = pipeline("zero-shot-classification", model=model_name)

    def classify(self, text: str) -> Dict[str, Any]:
        if not text:
            return {"category": "other", "tags": [], "severity": "low", "reasons": ["empty text"]}

        result = self.pipe(text, candidate_labels=self.taxonomy, multi_label=False)

        # Pick top category
        category = result["labels"][0] if result["labels"] else "other"

        # Tags = top 3 labels
        tags = result["labels"][:3] if result["labels"] else []

        # Simple severity estimation based on confidence score
        score = result["scores"][0] if result["scores"] else 0
        if score > 0.85:
            severity = "high"
        elif score > 0.6:
            severity = "medium"
        else:
            severity = "low"

        return {
            "category": category,
            "tags": tags,
            "severity": severity,
            "reasons": [f"Predicted {category} with score {score:.2f}"]
        }
