from fastapi import APIRouter, HTTPException
from .models.negotiation_model import StartSessionRequest, ChatTurnRequest, ChatTurnResponse
from .services.negotiation_service import NegotiationService, NegotiationEngine
from .services.intelligent_negotiation_service import IntelligentNegotiationEngine, IntelligentNegotiationService
from .models.provider_model import ProviderConfig

router = APIRouter(prefix="/negotiation", tags=["Negotiation"])

# In-memory sessions (for demo). In production, move to Redis/DB.
_sessions: dict[str, NegotiationEngine] = {}
_intelligent_sessions: dict[str, IntelligentNegotiationEngine] = {}

@router.post("/start")
def start_session(payload: StartSessionRequest):
    provider = ProviderConfig(
        product_id=payload.product_id,
        product_name=payload.product_name,
        list_price=payload.list_price,
        min_price=payload.min_price,
        currency=payload.currency or "INR",
    )
    if provider.min_price <= 0 or provider.list_price <= 0 or provider.min_price > provider.list_price:
        raise HTTPException(status_code=400, detail="Invalid price bounds.")
    eng = NegotiationEngine(provider)
    _sessions[payload.session_id] = eng
    return {
        "message": "Session started",
        "session_id": payload.session_id,
        "bounds": {"list_price": provider.list_price, "min_price": provider.min_price},
    }

@router.post("/chat", response_model=ChatTurnResponse)
def chat(payload: ChatTurnRequest):
    eng = _sessions.get(payload.session_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Session not found. Call /start first.")
    res = eng.step(user_message=payload.user_message, buyer_hint_budget=payload.buyer_budget)
    return ChatTurnResponse(**res)

@router.get("/session/{session_id}")
def session_state(session_id: str):
    eng = _sessions.get(session_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Session not found.")
    return eng.dump_state()

# Intelligent negotiation
@router.post("/intelligent/start")
def start_intelligent_session(payload: StartSessionRequest):
    provider = None
    if hasattr(payload, "product_name") and payload.product_name and payload.product_name != "Auto-detect":
        provider = ProviderConfig(
            product_id=payload.product_id,
            product_name=payload.product_name,
            list_price=payload.list_price,
            min_price=payload.min_price,
            currency=payload.currency or "INR",
        )
        if provider.min_price <= 0 or provider.list_price <= 0 or provider.min_price > provider.list_price:
            raise HTTPException(status_code=400, detail="Invalid price bounds.")

    eng = IntelligentNegotiationService.create_engine(provider)
    _intelligent_sessions[payload.session_id] = eng

    return {
        "message": "Intelligent negotiation session started",
        "session_id": payload.session_id,
        "ai_enabled": eng.use_ai,
        "bounds": {
            "list_price": provider.list_price if provider else "Auto-detect",
            "min_price": provider.min_price if provider else "Auto-detect",
        },
    }

@router.post("/intelligent/chat", response_model=ChatTurnResponse)
def intelligent_chat(payload: ChatTurnRequest):
    eng = _intelligent_sessions.get(payload.session_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Intelligent session not found. Call /intelligent/start first.")
    res = eng.step(user_message=payload.user_message, buyer_hint_budget=payload.buyer_budget)
    return ChatTurnResponse(**res)

@router.get("/intelligent/session/{session_id}")
def intelligent_session_state(session_id: str):
    eng = _intelligent_sessions.get(session_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Intelligent session not found.")
    return eng.dump_state()

@router.post("/train-ai")
def train_ai_models():
    try:
        results = IntelligentNegotiationService.train_ai_models()
        return {"message": "AI models trained successfully", "results": results}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.post("/generate-dataset")
def generate_training_dataset(num_conversations: int = 200):
    try:
        from .training.service_dataset_generator import ServiceDatasetGenerator
        generator = ServiceDatasetGenerator()
        dataset = generator.generate_training_dataset(num_conversations=num_conversations)
        filepath = generator.save_dataset(dataset)
        return {"message": "Dataset generated successfully", "filepath": filepath, "num_conversations": len(dataset)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset generation failed: {str(e)}")