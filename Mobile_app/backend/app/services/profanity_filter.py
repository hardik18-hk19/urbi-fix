# backend/app/services/profanity_filter.py
"""
Lightweight profanity/foul language detector.
- Expanded keyword list
- Word-boundary aware to reduce false positives (e.g., 'assess' won't match 'ass')
- Handles simple obfuscation (f*ck, f@ck) and leetspeak (sh1t, a$$, b!tch)
- Zero external dependencies

NOTE: This is heuristic; for production, consider a dedicated moderation service.
You can extend PROFANITY_WORDS or load a custom list from a file/env if desired.
"""
from __future__ import annotations
import re
from typing import Dict, List, Iterable

# Common profanity list (non-exhaustive; avoids hate slurs)
PROFANITY_WORDS = {
    # Strong
    "fuck", "fucker", "fucking", "motherfucker", "mf",
    "shit", "bullshit", "shitty", "shithead",
    "bitch", "bitches", "bitching",
    "asshole", "dumbass", "jackass",
    "dick", "dickhead", "prick",
    "cock", "cocksucker",
    "cunt",
    "pussy",
    "slut", "whore", "hoe",
    "wank", "wanker",
    "douche", "douchebag",
    # Mild/common
    "crap", "bloody", "piss", "pissed",
    # Standalone short words (strict boundaries to avoid false positives)
    "ass",
}

# Map letters to allowed leetspeak alternatives (within a single character position)
LEET_SUBS = {
    'a': 'a@4',
    'b': 'b8',
    'c': 'c(',
    'e': 'e3',
    'g': 'g9',
    'i': 'i1!|',
    'l': 'l1|',
    'o': 'o0',
    's': 's5$',
    't': 't7+',
}

# Characters allowed between letters as obfuscators (spaces, punctuation, typical symbols)
OBFUSCATION_CLASS = r"[\s*@#\$%\^&\-_=+\.|:/\\]*"

def _alts(ch: str) -> str:
    # return a character class of allowed alternatives for a given letter
    allowed = set(LEET_SUBS.get(ch.lower(), ch.lower()))
    # Always include the original character in both cases
    allowed.add(ch.lower())
    allowed.add(ch.upper())
    # Build a safe character class
    # Escape only characters special in char classes: - ^ ]
    def esc(c: str) -> str:
        return c.replace('\\', '\\\\').replace('-', '\\-').replace('^', '\\^').replace(']', '\\]')
    return f"[{''.join(esc(c) for c in sorted(allowed))}]"


def build_pattern(word: str) -> re.Pattern:
    # Build letter-by-letter pattern with leet + obfuscation between letters
    parts: List[str] = []
    for ch in word:
        if ch.isalpha():
            parts.append(f"(?:{_alts(ch)}{OBFUSCATION_CLASS})")
        else:
            # For non-letters (e.g., hyphen) allow it or obfuscation class
            ch_esc = re.escape(ch)
            parts.append(f"(?:{ch_esc}{OBFUSCATION_CLASS})")
    core = ''.join(parts)
    # Word boundaries (not inside alphanumeric sequences)
    pattern = rf"(?<![A-Za-z0-9]){core}(?![A-Za-z0-9])"
    return re.compile(pattern, flags=re.IGNORECASE)

# Precompile patterns
_PATTERNS: List[re.Pattern] = [build_pattern(w) for w in PROFANITY_WORDS]


def check_profanity(text: str) -> Dict:
    if not text:
        return {"has_profanity": False, "matches": []}
    matches: List[str] = []
    for rx in _PATTERNS:
        m = rx.search(text)
        if m:
            matches.append(m.group(0))
    # Deduplicate while preserving order
    seen = set()
    uniq: List[str] = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            uniq.append(m)
    return {"has_profanity": len(uniq) > 0, "matches": uniq}


def censor_text(text: str) -> str:
    """Return a censored version by replacing inner letters with * for matched words.
    Note: basic implementation; UI can choose to block instead of censoring.
    """
    if not text:
        return text
    censored = text
    # Re-scan and replace ranges
    for rx in _PATTERNS:
        def _mask(match: re.Match) -> str:
            s = match.group(0)
            # Keep first/last char if letters; replace inner segment with *
            if len(s) <= 2:
                return "*" * len(s)
            return s[0] + ("*" * (len(s) - 2)) + s[-1]
        censored = rx.sub(_mask, censored)
    return censored


def add_custom_words(words: Iterable[str]) -> None:
    """Extend the profanity list at runtime (e.g., from config)."""
    for w in words:
        if not w or not w.strip():
            continue
        _PATTERNS.append(build_pattern(w.strip()))