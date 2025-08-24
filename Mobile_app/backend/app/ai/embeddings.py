# backend/app/ai/embeddings.py
from __future__ import annotations
from typing import List, Optional
import math

# Try to use sentence-transformers if available; otherwise fallback to a lightweight hashing embedding.
try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:  # pragma: no cover
    SentenceTransformer = None  # type: ignore

import re
import hashlib


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _hash_vector(text: str, dim: int = 256) -> List[float]:
    """Very small, dependency-free fallback embedding using token hashing.
    Produces a normalized vector of length `dim`.
    """
    vec = [0.0] * dim
    for tok in _normalize(text).split(" "):
        if not tok:
            continue
        h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 1) & 1) else -1.0
        vec[idx] += sign
    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


class EmbeddingsClient:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", dim: int = 256):
        self.model_name = model_name
        self.dim = dim
        self._sbert = None
        if SentenceTransformer is not None:
            try:
                self._sbert = SentenceTransformer(model_name)
            except Exception:
                self._sbert = None

    def encode(self, text: Optional[str]) -> List[float]:
        text = text or ""
        if not text.strip():
            return []
        # Prefer SBERT if available
        if self._sbert is not None:
            try:
                emb = self._sbert.encode([text], normalize_embeddings=True)
                return emb[0].tolist()
            except Exception:
                pass
        # Fallback: hashing vector
        return _hash_vector(text, dim=self.dim)