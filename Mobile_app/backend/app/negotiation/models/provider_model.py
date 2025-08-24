from pydantic import BaseModel

class ProviderConfig(BaseModel):
    product_id: int
    product_name: str
    list_price: float
    min_price: float
    currency: str = "INR"