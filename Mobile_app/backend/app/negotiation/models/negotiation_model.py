from pydantic import BaseModel, Field
from typing import Optional, List, Any

class StartSessionRequest(BaseModel):
    session_id: str = Field(..., description="Unique session id (e.g., UUID from client).")
    product_id: int
    product_name: str
    list_price: float = Field(..., gt=0)
    min_price: float = Field(..., gt=0)
    currency: Optional[str] = "INR"

class ChatTurnRequest(BaseModel):
    session_id: str
    user_message: str
    buyer_budget: Optional[float] = Field(default=None, description="Optional buyer-declared budget.")

class ChatTurnResponse(BaseModel):
    reply: str
    status: str  # "ongoing" | "accepted" | "rejected"
    final_price: Optional[float] = None
    history: List[Any]