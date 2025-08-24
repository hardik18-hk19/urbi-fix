import re
from typing import Optional

def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))

# Extract first integer/decimal-like price from text (handles ₹, $, commas)
_PRICE_PAT = re.compile(r"(?:₹|\$)?\s*([0-9][0-9,]*\.?[0-9]*)")

def extract_price(text: str) -> Optional[float]:
    if not text:
        return None
    m = _PRICE_PAT.search(text)
    if not m:
        return None
    try:
        val = float(m.group(1).replace(",", ""))
        return val
    except Exception:
        return None

def moving_towards(current: float, target: float, rate: float) -> float:
    # one step towards target by 'rate' fraction
    return current + rate * (target - current)

def expected_revenue_grid(min_price: float, list_price: float, accept_fn, steps: int = 40) -> float:
    # Search price maximizing p * P_accept(p) without numpy
    step_size = (list_price - min_price) / (steps - 1)
    grid = [min_price + i * step_size for i in range(steps)]
    
    best_p, best_obj = min_price, -1.0
    for p in grid:
        pa = float(accept_fn(p))
        obj = p * pa
        if obj > best_obj:
            best_obj, best_p = obj, p
    return round(best_p, 2)