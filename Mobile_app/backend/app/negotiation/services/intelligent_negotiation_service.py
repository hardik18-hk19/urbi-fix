import json
import os
import random
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

from ..models.provider_model import ProviderConfig
from ..training.intelligent_negotiation_model import IntelligentNegotiationModel, NegotiationContext

@dataclass
class IntelligentTurn:
    user_message: str
    user_offer: Optional[float]
    bot_message: str
    bot_offer: Optional[float]
    accepted: Optional[bool]
    service_context: Optional[Dict[str, Any]] = None
    strategy_used: Optional[str] = None

@dataclass
class IntelligentNegotiationState:
    status: str = "ongoing"
    final_price: Optional[float] = None
    history: List[IntelligentTurn] = field(default_factory=list)
    rounds: int = 0
    service_context: Optional[NegotiationContext] = None
    current_strategy: Optional[str] = None

class IntelligentNegotiationEngine:
    """
    Enhanced negotiation engine that uses AI to understand service context,
    classify complexity, and provide intelligent negotiation strategies.
    """
    
    def __init__(self, provider: Optional[ProviderConfig] = None):
        self.provider = provider
        self.state = IntelligentNegotiationState()
        self.ai_model = IntelligentNegotiationModel()
        
        # Try to load pre-trained models
        if not self.ai_model.load_models():
            print("⚠️ AI models not found. Using fallback negotiation logic.")
            self.use_ai = False
        else:
            self.use_ai = True
        
        # Current bot offer
        self.current_bot_offer = float(provider.list_price) if provider else 500.0
        
        # Conversation context for AI
        self.conversation_history = []
        # Track consecutive offers below minimum price for handoff
        self.low_offer_strikes = 0
        
        # Data persistence
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        self.data_file = os.path.join(base_dir, 'data', 'intelligent_negotiation_history.json')
        self._history = self._load_history()
    
    def _load_history(self) -> List[Dict[str, Any]]:
        """Load negotiation history for learning"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data if isinstance(data, list) else []
            except Exception:
                pass
        return []
    
    def _append_history(self, row: Dict[str, Any]) -> None:
        """Append negotiation data to history"""
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        self._history.append(row)
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(self._history, f, indent=2, ensure_ascii=False)
    
    def _extract_price_from_message(self, message: str) -> Optional[float]:
        """Extract price from user message"""
        import re
        
        # Look for price patterns
        patterns = [
            r'₹\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # ₹500, ₹1,000
            r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr)',  # 500 rupees, 1000 rs
            r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:only|max|maximum)',  # 500 only, 1000 max
            r'(?:offer|pay|budget)\s*(?:is|of)?\s*₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)',  # offer 500, budget 1000
            r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:bucks|dollars)?'  # 500 bucks (fallback)
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                price_str = match.group(1).replace(',', '')
                try:
                    return float(price_str)
                except ValueError:
                    continue
        
        return None
    
    def _generate_contextual_response(self, context: NegotiationContext, strategy: Dict[str, Any], user_offer: Optional[float]) -> str:
        """Generate contextually appropriate response"""
        
        service_responses = {
            "plumbing": {
                "simple": [
                    f"For a simple {context.service_type} job like this, I can offer ₹{strategy['suggested_counter_offer']}",
                    f"This type of {context.service_type} work typically costs ₹{strategy['suggested_counter_offer']}",
                    f"For basic {context.service_type} repair, my rate is ₹{strategy['suggested_counter_offer']}"
                ],
                "medium": [
                    f"This {context.service_type} job requires some expertise. I can do it for ₹{strategy['suggested_counter_offer']}",
                    f"For this type of {context.service_type} work, including parts and labor, ₹{strategy['suggested_counter_offer']}",
                    f"Given the complexity of this {context.service_type} job, ₹{strategy['suggested_counter_offer']} would be fair"
                ],
                "complex": [
                    f"This is major {context.service_type} work requiring specialized skills. My quote is ₹{strategy['suggested_counter_offer']}",
                    f"For complex {context.service_type} projects like this, ₹{strategy['suggested_counter_offer']} covers everything",
                    f"This extensive {context.service_type} work justifies ₹{strategy['suggested_counter_offer']}"
                ]
            },
            "electrical": {
                "simple": [
                    f"For basic electrical work like this, ₹{strategy['suggested_counter_offer']} is reasonable",
                    f"Simple electrical repairs typically cost ₹{strategy['suggested_counter_offer']}",
                    f"This electrical job can be done for ₹{strategy['suggested_counter_offer']}"
                ],
                "medium": [
                    f"This electrical work requires proper safety measures. ₹{strategy['suggested_counter_offer']} includes everything",
                    f"For this type of electrical job, ₹{strategy['suggested_counter_offer']} covers parts and safe installation",
                    f"Electrical work of this complexity costs ₹{strategy['suggested_counter_offer']}"
                ],
                "complex": [
                    f"Major electrical work like this requires certified expertise. ₹{strategy['suggested_counter_offer']} is my quote",
                    f"Complex electrical projects need proper planning and safety. ₹{strategy['suggested_counter_offer']} covers everything",
                    f"This extensive electrical work justifies ₹{strategy['suggested_counter_offer']}"
                ]
            },
            "cleaning": {
                "simple": [
                    f"For basic cleaning service, ₹{strategy['suggested_counter_offer']} is standard",
                    f"Regular house cleaning costs ₹{strategy['suggested_counter_offer']}",
                    f"This cleaning job can be completed for ₹{strategy['suggested_counter_offer']}"
                ],
                "medium": [
                    f"Deep cleaning requires more time and effort. ₹{strategy['suggested_counter_offer']} is fair",
                    f"For thorough cleaning service, ₹{strategy['suggested_counter_offer']} includes all supplies",
                    f"This level of cleaning work costs ₹{strategy['suggested_counter_offer']}"
                ],
                "complex": [
                    f"Specialized cleaning like this requires professional equipment. ₹{strategy['suggested_counter_offer']} covers everything",
                    f"Complex cleaning projects need expert handling. ₹{strategy['suggested_counter_offer']} is justified",
                    f"This extensive cleaning work requires ₹{strategy['suggested_counter_offer']}"
                ]
            }
        }
        
        # Get appropriate response template
        service_type = context.service_type if context.service_type in service_responses else "plumbing"
        complexity = context.complexity if context.complexity in ["simple", "medium", "complex"] else "medium"
        
        responses = service_responses[service_type][complexity]
        base_response = random.choice(responses)
        
        # Add strategy-specific additions
        if strategy['strategy'] == 'aggressive' and user_offer and user_offer < context.min_price:
            base_response += f". I understand budget is a concern, but ₹{context.min_price} is my absolute minimum for quality work."
        elif strategy['strategy'] == 'conservative':
            base_response += ". This price includes warranty and quality guarantee."
        elif user_offer and user_offer > 0:
            if user_offer < strategy['suggested_counter_offer'] * 0.8:
                base_response += f". Your offer of ₹{user_offer} is quite low for this type of work."
            elif user_offer >= strategy['suggested_counter_offer'] * 0.9:
                base_response = f"I appreciate your offer of ₹{user_offer}. How about we meet at ₹{strategy['suggested_counter_offer']}?"
        
        return base_response
    
    def step(self, user_message: str, buyer_hint_budget: Optional[float] = None) -> Dict[str, Any]:
        """
        Process one negotiation turn with AI-enhanced understanding
        """
        if self.state.status != "ongoing":
            return {
                "reply": f"Negotiation already {self.state.status}.",
                "status": self.state.status,
                "final_price": self.state.final_price,
                "history": [self._turn_to_dict(t) for t in self.state.history],
            }
        
        # Extract user offer from message
        user_offer = self._extract_price_from_message(user_message)
        if user_offer is None and buyer_hint_budget:
            user_offer = buyer_hint_budget
        
        # Update conversation history
        self.conversation_history.append({
            "role": "consumer",
            "message": user_message,
            "offer": user_offer
        })
        
        # Use AI to understand context (if available)
        if self.use_ai:
            try:
                context = self.ai_model.predict_service_context(user_message, self.conversation_history)
                strategy = self.ai_model.suggest_negotiation_strategy(context)
                
                # Update state with AI insights
                self.state.service_context = context
                self.state.current_strategy = strategy['strategy']
                
                # If no provider config was set, use AI predictions
                if not self.provider:
                    self.provider = ProviderConfig(
                        product_id=1,
                        product_name=f"{context.service_type.title()} Service ({context.complexity})",
                        list_price=context.base_price,
                        min_price=context.min_price,
                        currency="INR"
                    )
                    self.current_bot_offer = context.base_price
                
            except Exception as e:
                print(f"⚠️ AI prediction failed: {e}. Using fallback logic.")
                context = None
                strategy = {"strategy": "moderate", "suggested_counter_offer": self.current_bot_offer}
        else:
            context = None
            strategy = {"strategy": "moderate", "suggested_counter_offer": self.current_bot_offer}
        
        # Ensure provider exists even if AI is disabled or failed (fallback defaults)
        if not self.provider:
            self.provider = ProviderConfig(
                product_id=0,
                product_name="General Service",
                list_price=500.0,
                min_price=300.0,
                currency="INR",
            )
            # Keep current bot offer in a sensible range
            self.current_bot_offer = max(self.current_bot_offer, self.provider.min_price)
        
        # Decision logic
        lo, hi = self.provider.min_price, self.provider.list_price
        
        # If user didn't provide an offer, make an initial offer
        if user_offer is None:
            if context and self.use_ai:
                bot_msg = self._generate_contextual_response(context, strategy, None)
                counter = strategy['suggested_counter_offer']
            else:
                counter = self.current_bot_offer * 0.95  # Small reduction
                bot_msg = f"For {self.provider.product_name}, I can offer ₹{counter}. What's your budget?"
            
            turn = IntelligentTurn(
                user_message, None, bot_msg, counter, None,
                service_context=context.__dict__ if context else None,
                strategy_used=strategy['strategy'] if strategy else None
            )
            self.state.history.append(turn)
            self.current_bot_offer = counter
            self.state.rounds += 1
            
            # Log for learning
            self._append_history({
                "user_message": user_message,
                "user_offer": None,
                "bot_offer": counter,
                "bot_message": bot_msg,
                "service_context": context.__dict__ if context else None,
                "strategy": strategy['strategy'] if strategy else None,
                "accepted": None
            })
            
            return {
                "reply": bot_msg,
                "status": self.state.status,
                "final_price": None,
                "history": [self._turn_to_dict(t) for t in self.state.history],
                "ai_insights": {
                    "service_type": context.service_type if context else "unknown",
                    "complexity": context.complexity if context else "unknown",
                    "strategy": strategy['strategy'] if strategy else "moderate"
                }
            }
        
        # 1. Reject extremely low offers (hard floor at 60% of min)
        if user_offer < 0.6 * lo:
            bot_msg = f"❌ ₹{user_offer} is too low for quality {self.provider.product_name}. My minimum is ₹{lo}."
            turn = IntelligentTurn(user_message, user_offer, bot_msg, None, False)
            self.state.history.append(turn)
            self.state.status = "rejected"
            
            self._append_history({
                "user_message": user_message,
                "user_offer": user_offer,
                "bot_offer": None,
                "bot_message": bot_msg,
                "service_context": context.__dict__ if context else None,
                "strategy": strategy['strategy'] if strategy else None,
                "accepted": False
            })
            
            return {
                "reply": bot_msg,
                "status": self.state.status,
                "final_price": None,
                "history": [self._turn_to_dict(t) for t in self.state.history],
            }
        
        # 1b. Track persistent low-balling and suggest provider handoff after 3-4 tries
        if user_offer < lo:
            self.low_offer_strikes += 1
        else:
            self.low_offer_strikes = 0
        
        if self.low_offer_strikes >= 4:
            handoff_msg = (
                f"📞 It seems your budget is below the minimum for {self.provider.product_name}. "
                f"Let me connect you directly with the provider to negotiate final details and scope."
            )
            turn = IntelligentTurn(user_message, user_offer, handoff_msg, None, None)
            self.state.history.append(turn)
            # Use a special status so the app can show a Connect button
            self.state.status = "handoff"
            
            self._append_history({
                "user_message": user_message,
                "user_offer": user_offer,
                "bot_offer": None,
                "bot_message": handoff_msg,
                "service_context": context.__dict__ if context else None,
                "strategy": strategy['strategy'] if strategy else None,
                "accepted": None,
                "status": "handoff"
            })
            
            return {
                "reply": handoff_msg,
                "status": self.state.status,
                "final_price": None,
                "history": [self._turn_to_dict(t) for t in self.state.history],
            }
        
        # 2. Accept good offers
        if user_offer >= max(lo, self.current_bot_offer * 0.95):
            final_price = max(lo, user_offer)
            bot_msg = f"✅ Excellent! Deal accepted at ₹{final_price} for {self.provider.product_name}."
            turn = IntelligentTurn(user_message, user_offer, bot_msg, self.current_bot_offer, True)
            self.state.history.append(turn)
            self.state.status = "accepted"
            self.state.final_price = final_price
            
            self._append_history({
                "user_message": user_message,
                "user_offer": user_offer,
                "bot_offer": self.current_bot_offer,
                "bot_message": bot_msg,
                "service_context": context.__dict__ if context else None,
                "strategy": strategy['strategy'] if strategy else None,
                "accepted": True,
                "final_price": final_price
            })
            
            return {
                "reply": bot_msg,
                "status": self.state.status,
                "final_price": final_price,
                "history": [self._turn_to_dict(t) for t in self.state.history],
            }
        
        # 3. Counter-offer using AI strategy
        if context and self.use_ai:
            counter = max(lo, strategy['suggested_counter_offer'])
            bot_msg = self._generate_contextual_response(context, strategy, user_offer)
        else:
            # Fallback logic
            gap = self.current_bot_offer - user_offer
            reduction = gap * 0.3  # Move 30% towards user offer
            counter = max(lo, self.current_bot_offer - reduction)
            bot_msg = f"I understand your budget. How about ₹{counter} for {self.provider.product_name}?"
        
        turn = IntelligentTurn(
            user_message, user_offer, bot_msg, counter, None,
            service_context=context.__dict__ if context else None,
            strategy_used=strategy['strategy'] if strategy else None
        )
        self.state.history.append(turn)
        self.current_bot_offer = counter
        self.state.rounds += 1
        
        # Add urgency after many rounds
        if self.state.rounds >= 8:
            bot_msg += f" This is my best offer for quality work."
        
        # Log for learning
        self._append_history({
            "user_message": user_message,
            "user_offer": user_offer,
            "bot_offer": counter,
            "bot_message": bot_msg,
            "service_context": context.__dict__ if context else None,
            "strategy": strategy['strategy'] if strategy else None,
            "accepted": None
        })
        
        return {
            "reply": bot_msg,
            "status": self.state.status,
            "final_price": None,
            "history": [self._turn_to_dict(t) for t in self.state.history],
            "ai_insights": {
                "service_type": context.service_type if context else "unknown",
                "complexity": context.complexity if context else "unknown",
                "strategy": strategy['strategy'] if strategy else "moderate",
                "confidence": "high" if self.use_ai else "low"
            }
        }
    
    def _turn_to_dict(self, turn: IntelligentTurn) -> Dict[str, Any]:
        """Convert turn to dictionary for JSON serialization"""
        return {
            "user_message": turn.user_message,
            "user_offer": turn.user_offer,
            "bot_message": turn.bot_message,
            "bot_offer": turn.bot_offer,
            "accepted": turn.accepted,
            "service_context": turn.service_context,
            "strategy_used": turn.strategy_used
        }
    
    def dump_state(self) -> Dict[str, Any]:
        """Return current negotiation state"""
        return {
            "provider": self.provider.dict() if self.provider else None,
            "status": self.state.status,
            "final_price": self.state.final_price,
            "rounds": self.state.rounds,
            "current_strategy": self.state.current_strategy,
            "service_context": self.state.service_context.__dict__ if self.state.service_context else None,
            "history": [self._turn_to_dict(t) for t in self.state.history],
            "ai_enabled": self.use_ai
        }

# Service class for dependency injection
class IntelligentNegotiationService:
    """Service wrapper for the intelligent negotiation engine"""
    
    @staticmethod
    def create_engine(provider: Optional[ProviderConfig] = None) -> IntelligentNegotiationEngine:
        """Create a new intelligent negotiation engine"""
        return IntelligentNegotiationEngine(provider)
    
    @staticmethod
    def train_ai_models(dataset_path: str = None) -> Dict[str, Any]:
        """Train the AI models with negotiation data"""
        model = IntelligentNegotiationModel()
        
        if dataset_path is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            dataset_path = os.path.join(base_dir, 'data', 'comprehensive_negotiation_dataset.json')
        
        if not os.path.exists(dataset_path):
            raise FileNotFoundError(f"Dataset not found at {dataset_path}. Please generate it first.")
        
        return model.train_complete_model(dataset_path)