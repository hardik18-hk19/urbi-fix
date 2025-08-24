# backend/app/services/gibberish_detector.py
"""
Simple, lightweight gibberish detector.
Heuristics-based to avoid heavy ML dependencies.
Returns an assessment dict with score, flags and reasons.

Stricter rules:
- Require minimum length and word count
- Penalize very short words and missing vowels
"""
from __future__ import annotations
import re
from typing import Dict, List

VOWELS = set("aeiou")


def _letters_only(text: str) -> str:
    return re.sub(r"[^A-Za-z]+", "", text or "")


def _words(text: str) -> List[str]:
    return re.findall(r"[A-Za-z]+", text or "")


def assess_text(text: str) -> Dict:
    """
    Assess text quality. Higher score => more likely gibberish.
    """
    reasons: List[str] = []
    score = 0

    if not text or not text.strip():
        return {"is_gibberish": True, "score": 3, "reasons": ["Empty text"]}

    letters = _letters_only(text)
    total_len = len(text)
    letters_len = len(letters)
    words = _words(text)

    # Rule 1: Minimum meaningful content length
    if letters_len < 12:
        score += 2
        reasons.append("Too short for a meaningful complaint")

    # Rule 1b: Minimum number of words
    if len(words) < 3:
        score += 2
        reasons.append("Too few words")

    # Rule 2: Low letter ratio (lots of symbols/numbers)
    if total_len >= 12:
        letter_ratio = letters_len / max(1, total_len)
        if letter_ratio < 0.5:
            score += 1
            reasons.append("Contains too many non-letter characters")

    # Rule 3: Vowel ratio too low
    if letters_len >= 12:
        vowels = sum(1 for ch in letters.lower() if ch in VOWELS)
        vowel_ratio = vowels / max(1, letters_len)
        if vowel_ratio < 0.28:
            score += 1
            reasons.append("Low vowel ratio (looks like random letters)")

    # Rule 4: Word-level checks
    long_words = [w for w in words if len(w) >= 4]
    if len(long_words) >= 3:
        no_vowel_words = [w for w in long_words if not any(c in VOWELS for c in w.lower())]
        if len(no_vowel_words) / max(1, len(long_words)) > 0.5:
            score += 1
            reasons.append("Most words lack vowels")

    # Rule 5: Repetitiveness / very low uniqueness
    if letters_len >= 20:
        unique_ratio = len(set(letters.lower())) / letters_len
        if unique_ratio < 0.3:
            score += 1
            reasons.append("Very repetitive characters")
        if re.search(r"([A-Za-z])\1{4,}", letters):  # e.g., xxxxx
            score += 1
            reasons.append("Contains long runs of the same character")

    return {
        "is_gibberish": score >= 2,
        "score": score,
        "reasons": reasons,
    }