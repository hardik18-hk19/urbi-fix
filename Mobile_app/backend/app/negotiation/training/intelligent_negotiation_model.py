import os
from dataclasses import dataclass
from typing import Dict, List, Any, Optional

@dataclass
class NegotiationContext:
    service_type: str
    complexity: str
    user_message: str
    conversation_history: List[Dict[str, Any]]
    current_offer: Optional[float]
    base_price: float
    min_price: float

class IntelligentNegotiationModel:
    """
    Lightweight, dependency-free heuristic model for service context and strategy.
    Designed to avoid heavy ML dependencies in the backend runtime. If trained
    models are later added, extend load_models/predict methods to use them.
    """

    def __init__(self):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        self.model_dir = os.path.join(base_dir, 'models', 'trained')
        os.makedirs(self.model_dir, exist_ok=True)

    def load_models(self) -> bool:
        """Return False to indicate no trained models available by default."""
        # You can extend this to attempt loading pickled models if present.
        return False

    def extract_features_from_message(self, message: str, conversation_history: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        m = (message or '').lower()
        features = {
            'has_budget': any(w in m for w in ['budget', '₹', 'rs', 'inr', 'price', 'cost']),
            'urgency': sum(1 for w in ['urgent', 'emergency', 'asap', 'immediately', 'quick'] if w in m),
            'quality': sum(1 for w in ['quality', 'professional', 'experienced', 'certified'] if w in m),
        }
        features['conversation_length'] = len(conversation_history or [])
        return features

    def _infer_service_type(self, message: str) -> str:
        m = (message or '').lower()
        mapping = {
            'plumbing': ['tap', 'pipe', 'leak', 'toilet', 'drain', 'plumb'],
            'electrical': ['switch', 'socket', 'outlet', 'wiring', 'breaker', 'electric', 'fan', 'light'],
            'cleaning': ['clean', 'cleanup', 'dust', 'carpet', 'wash'],
            'hvac': ['ac', 'hvac', 'cooling', 'refrigerant', 'compressor', 'air'],
            'appliance': ['fridge', 'refrigerator', 'washing', 'washer', 'dishwasher', 'microwave', 'appliance'],
        }
        for svc, keywords in mapping.items():
            if any(k in m for k in keywords):
                return svc
        return 'plumbing'

    def _infer_complexity(self, message: str) -> str:
        m = (message or '').lower()
        if any(w in m for w in ['major', 'complete', 'complex', 'renovation', 'installation', 'upgrade']):
            return 'complex'
        if any(w in m for w in ['simple', 'basic', 'minor', 'small', 'quick', 'easy']):
            return 'simple'
        return 'medium'

    def predict_service_context(self, user_message: str, conversation_history: List[Dict[str, Any]] | None = None) -> NegotiationContext:
        service_type = self._infer_service_type(user_message)
        complexity = self._infer_complexity(user_message)

        base_prices = {
            ('plumbing', 'simple'): 300, ('plumbing', 'medium'): 800, ('plumbing', 'complex'): 2000,
            ('electrical', 'simple'): 250, ('electrical', 'medium'): 600, ('electrical', 'complex'): 1500,
            ('cleaning', 'simple'): 400, ('cleaning', 'medium'): 800, ('cleaning', 'complex'): 1500,
            ('hvac', 'simple'): 350, ('hvac', 'medium'): 1200, ('hvac', 'complex'): 3000,
            ('appliance', 'simple'): 300, ('appliance', 'medium'): 800, ('appliance', 'complex'): 1800,
        }
        base_price = base_prices.get((service_type, complexity), 500)
        min_price = round(base_price * 0.7, 2)

        return NegotiationContext(
            service_type=service_type,
            complexity=complexity,
            user_message=user_message,
            conversation_history=conversation_history or [],
            current_offer=None,
            base_price=base_price,
            min_price=min_price,
        )

    def suggest_negotiation_strategy(self, context: NegotiationContext) -> Dict[str, Any]:
        # Simple heuristic strategy
        urgency = sum(1 for w in ['urgent', 'asap', 'immediately'] if w in context.user_message.lower())
        if urgency >= 1:
            strategy = 'conservative'  # less discount if urgent
            discount = 0.05
        elif context.complexity == 'simple':
            strategy = 'aggressive'
            discount = 0.15
        else:
            strategy = 'moderate'
            discount = 0.10
        suggested = max(context.min_price, round(context.base_price * (1 - discount), 2))
        return {'strategy': strategy, 'suggested_counter_offer': suggested}

    def train_complete_model(self, dataset_path: str) -> Dict[str, Any]:
        # Placeholder: in a lightweight backend, training is not implemented
        return {
            'status': 'not_implemented',
            'message': 'Training is disabled in lightweight backend. Provide pre-trained models to enable AI mode.',
            'dataset_path': dataset_path,
        }