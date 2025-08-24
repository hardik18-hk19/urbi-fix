# backend/app/ai/utils.py
import os
from pathlib import Path
from typing import List

BASE = Path(__file__).resolve().parent
MODELS_DIR = BASE / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def env(key: str, default=None):
    v = os.getenv(key)
    return v if v is not None else default

# Configure taxonomy here or override by passing taxonomy to AutoTagger
DEFAULT_TAXONOMY: List[str] = env(
    "TAXONOMY",
    None
)
if DEFAULT_TAXONOMY:
    DEFAULT_TAXONOMY = [t.strip() for t in DEFAULT_TAXONOMY.split(",")]
else:
    DEFAULT_TAXONOMY = [
        "pothole",
        "water_leak",
        "garbage_dump",
        "electrical_fault",
        "street_light_issue",
        "road_blockage",
        "traffic_signal",
        "tree_fall",
        "road_accident",
        "other"
    ]
