import json
import os
import math
import random
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

from ..models.provider_model import ProviderConfig
from .utils import clamp, extract_price, moving_towards, expected_revenue_grid

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "negotiation_history.json")

@dataclass
class Turn:
    user_message: str
    user_offer: Optional[float]
    bot_message: str
    bot_offer: Optional[float]
    accepted: Optional[bool]  # None=ongoing, True/False=terminal

@dataclass
class NegotiationState:
    status: str = "ongoing"      # "ongoing" | "accepted" | "rejected"
    final_price: Optional[float] = None
    history: List[Turn] = field(default_factory=list)
    rounds: int = 0

class NegotiationEngine:
    """
    Dynamic negotiation engine:
      1) Starts with formulas (cold start).
      2) Learns an acceptance curve from history to pick counter-offers that maximize expected revenue.
      3) Respects provider.min_price, but can offer a limited scope-based discount floor (down to ~80% of min) if the user explicitly asks for reduced scope.
    """
    def __init__(self, provider: ProviderConfig):
        self.provider = provider
        self.state = NegotiationState()
        self._history = self._load_history()  # list of dict rows

        # Starting bot offer: the list price
        self.current_bot_offer = float(provider.list_price)

        # Floors and dynamics
        self.base_min = float(provider.min_price)
        self.floor = float(provider.min_price)  # may adjust if user asks for reduced scope
        self.low_offer_strikes = 0  # consecutive offers below our floor

        # Cold-start parameters (will adapt via experience)
        self.alpha_buyer = 0.30  # how quickly buyer moves toward budget (simulated)
        self.beta_seller = 0.30  # how quickly bot moves toward min_price

        # Exploration rate when optimizing price
        self.explore_eps = 0.10

    # ---------- persistence ----------
    def _load_history(self) -> List[Dict[str, Any]]:
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
            except Exception:
                pass
        return []

    def _append_history(self, row: Dict[str, Any]) -> None:
        # Create file folder if missing
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        self._history.append(row)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self._history, f, indent=2)

    # ---------- acceptance modeling ----------
    def _fit_acceptance(self) -> Optional[Dict[str, float]]:
        """
        Fit a simple logistic curve: P(accept | price) = 1 / (1 + exp(-(a + b*price)))
        using past terminal turns for this product.
        Returns dict with 'a','b' if enough data; else None.
        """
        # Filter relevant rows (same product, with bot_offer & accepted label)
        rows = [r for r in self._history
                if r.get("product_id") == self.provider.product_id
                and r.get("bot_offer") is not None
                and r.get("accepted") is not None]

        if len(rows) < 12:  # need some data
            return None

        # Build X (price) and y (accepted 0/1)
        prices = [float(r["bot_offer"]) for r in rows]
        labels = [1 if r["accepted"] else 0 for r in rows]

        # Normalize price to [0,1] to stabilize a,b fitting
        lo, hi = self.provider.min_price, self.provider.list_price
        span = max(1e-6, hi - lo)
        z = [(p - lo) / span for p in prices]

        # Simple closed-form-ish gradient steps for logistic regression with 1 feature + bias
        a, b = 0.0, 0.0
        lr = 0.5
        for _ in range(400):
            da = 0.0
            db = 0.0
            for zi, yi in zip(z, labels):
                pred = 1.0 / (1.0 + math.exp(-(a + b * zi)))
                da += (pred - yi)
                db += (pred - yi) * zi
            a -= lr * da / len(z)
            b -= lr * db / len(z)

        return {"a": a, "b": b, "lo": lo, "hi": hi}

    def _accept_prob_fn(self):
        """
        Returns a function price->probability using fitted curve if available,
        else a heuristic sigmoid around midpoint.
        """
        fitted = self._fit_acceptance()
        lo, hi = self.provider.min_price, self.provider.list_price

        if fitted:
            a, b = fitted["a"], fitted["b"]
            span = max(1e-6, hi - lo)
            def prob(p: float) -> float:
                z = (p - lo) / span
                return 1.0 / (1.0 + math.exp(-(a + b * z)))
            return prob

        # Cold-start heuristic: acceptance rises near user's offer and near min→mid range
        mid = (lo + hi) / 2.0
        def cold_prob(p: float) -> float:
            # higher prob near mid, taper near hi
            x = (p - lo) / max(1e-6, hi - lo)
            # bell-shaped around ~0.45–0.6
            return max(0.01, min(0.99, 1.0 / (1.0 + math.exp(8.0 * (x - 0.55)))))
        return cold_prob

    # ---------- policy ----------
    def _choose_counter(self, user_offer: Optional[float]) -> float:
        lo, hi = self.floor, self.provider.list_price

        # With some probability, explore near user offer (if present)
        if user_offer is not None and random.random() < self.explore_eps:
            # explore a small band above user's offer but not below min
            band_hi = clamp(user_offer + 0.15 * (hi - lo), lo, hi)
            p = random.uniform(max(lo, user_offer), band_hi)
            return round(p, 2)

        # Otherwise, pick revenue-maximizing price under current acceptance model
        prob_fn = self._accept_prob_fn()
        p_opt = expected_revenue_grid(lo, hi, prob_fn, steps=40)

        # slight smoothing towards current_bot_offer to avoid big jumps
        smooth = 0.5 * self.current_bot_offer + 0.5 * p_opt
        return round(clamp(smooth, lo, hi), 2)

    # ---------- single step ----------
    def step(self, user_message: str, buyer_hint_budget: Optional[float] = None) -> dict:
        """
        Advance one negotiation turn using the message. Extract a numeric offer if present.
        Learning happens by logging each turn; acceptance model refits over time.
        """
        if self.state.status != "ongoing":
            return {
                "reply": f"Negotiation already {self.state.status}.",
                "status": self.state.status,
                "final_price": self.state.final_price,
                "history": [t.__dict__ for t in self.state.history],
            }

        lo, hi = self.floor, self.provider.list_price
        user_offer = extract_price(user_message)

        # If user didn't give a number, nudge our offer towards mid/min depending on message count
        if user_offer is None:
            counter = self._choose_counter(user_offer=None)
            bot_msg = f"🤝 For {self.provider.product_name}, I can offer {counter} {self.provider.currency}. What’s your offer?"
            turn = Turn(user_message, None, bot_msg, counter, None)
            self.state.history.append(turn)
            self.current_bot_offer = counter
            self.state.rounds += 1
            # Log
            self._append_history({
                "product_id": self.provider.product_id,
                "user_offer": None,
                "bot_offer": counter,
                "accepted": None,
                "user_message": user_message,
                "bot_message": bot_msg
            })
            return {
                "reply": bot_msg,
                "status": self.state.status,
                "final_price": None,
                "history": [t.__dict__ for t in self.state.history],
            }

        # Decision logic with hard constraints
        # 1) Detect scope reduction intent and allow limited discount floor
        text_lower = user_message.lower()
        scope_keywords = ["less work", "smaller job", "basic", "partial", "only", "exclude", "without", "i will provide materials", "short visit"]
        if any(k in text_lower for k in scope_keywords):
            # Allow floor down to 80% of base_min when scope is reduced
            self.floor = round(max(0.8 * self.base_min, self.base_min - 0.2 * (self.provider.list_price - self.base_min)), 2)
        else:
            self.floor = self.base_min

        # 2) Count consecutive low offers below floor and handoff if persistent
        if user_offer is not None and user_offer < self.floor:
            self.low_offer_strikes += 1
        else:
            self.low_offer_strikes = 0

        if self.low_offer_strikes >= 4:
            bot_msg = (
                f"📞 It seems your budget is below the minimum I can do for {self.provider.product_name}. "
                f"I can connect you directly with the provider to discuss final details and see if a custom scope works."
            )
            turn = Turn(user_message, user_offer, bot_msg, None, None)
            self.state.history.append(turn)
            # Surface an intermediate status for the client to prompt a chat/handoff
            self.state.status = "handoff"
            self._append_history({
                "product_id": self.provider.product_id,
                "user_offer": user_offer,
                "bot_offer": None,
                "accepted": None,
                "user_message": user_message,
                "bot_message": bot_msg,
                "status": "handoff"
            })
            return {
                "reply": bot_msg,
                "status": self.state.status,
                "final_price": None,
                "history": [t.__dict__ for t in self.state.history],
            }

        # 3) If user offer is outrageously low (below 70% of current floor), gracefully end
        if user_offer is not None and user_offer < 0.7 * self.floor:
            bot_msg = f"❌ That’s too low for {self.provider.product_name}. Minimum acceptable is {self.floor} {self.provider.currency}."
            turn = Turn(user_message, user_offer, bot_msg, None, False)
            self.state.history.append(turn)
            self.state.status = "rejected"
            self.state.final_price = None
            self._append_history({
                "product_id": self.provider.product_id,
                "user_offer": user_offer,
                "bot_offer": None,
                "accepted": False,
                "user_message": user_message,
                "bot_message": bot_msg
            })
            return {
                "reply": bot_msg,
                "status": self.state.status,
                "final_price": None,
                "history": [t.__dict__ for t in self.state.history],
            }

        # 4) If user meets or exceeds our current offer, accept at user's price (never below floor)
        if user_offer is not None and user_offer >= max(lo, self.current_bot_offer):
            final_price = round(max(lo, user_offer), 2)
            bot_msg = f"✅ Deal accepted at {final_price} {self.provider.currency} for {self.provider.product_name}."
            turn = Turn(user_message, user_offer, bot_msg, self.current_bot_offer, True)
            self.state.history.append(turn)
            self.state.status = "accepted"
            self.state.final_price = final_price
            self._append_history({
                "product_id": self.provider.product_id,
                "user_offer": user_offer,
                "bot_offer": self.current_bot_offer,
                "accepted": True,
                "user_message": user_message,
                "bot_message": bot_msg,
                "final_price": final_price
            })
            return {
                "reply": bot_msg,
                "status": self.state.status,
                "final_price": final_price,
                "history": [t.__dict__ for t in self.state.history],
            }

        # 5) Counter-offer using learned acceptance curve (dynamic)
        counter = self._choose_counter(user_offer=user_offer)

        # Ensure we gradually move toward floor to keep the convo realistic
        counter = round(moving_towards(counter, lo, self.beta_seller * 0.15), 2)
        counter = round(clamp(counter, lo, hi), 2)

        suggestion = ""
        if self.floor < self.base_min:
            suggestion = " (basic scope)"

        bot_msg = f"🤝 How about {counter} {self.provider.currency} for {self.provider.product_name}{suggestion}?"
        turn = Turn(user_message, user_offer, bot_msg, counter, None)
        self.state.history.append(turn)
        self.current_bot_offer = counter
        self.state.rounds += 1

        # Soft stop if too many rounds
        if self.state.rounds >= 10:
            bot_msg = f"ℹ️ Let’s wrap up: best I can do is {counter} {self.provider.currency}{suggestion}."
            self.state.history[-1].bot_message = bot_msg

        # Log for learning
        self._append_history({
            "product_id": self.provider.product_id,
            "user_offer": user_offer,
            "bot_offer": counter,
            "accepted": None,
            "user_message": user_message,
            "bot_message": bot_msg
        })

        return {
            "reply": bot_msg,
            "status": self.state.status,
            "final_price": None,
            "history": [t.__dict__ for t in self.state.history],
        }

    def dump_state(self) -> dict:
        return {
            "provider": self.provider.dict(),
            "status": self.state.status,
            "final_price": self.state.final_price,
            "rounds": self.state.rounds,
            "history": [t.__dict__ for t in self.state.history],
        }

class NegotiationService:
    """Service wrapper for the negotiation engine"""
    
    @staticmethod
    def create_engine(provider: ProviderConfig) -> NegotiationEngine:
        """Create a new negotiation engine"""
        return NegotiationEngine(provider)