# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
from ..db import get_db
from ..models.user import User
from ..models.provider import Provider
from ..schemas.user import UserCreate, UserLogin, UserOut, UserUpdate
from ..services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from ..config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


# 🔹 Utility: normalize roles
def _normalize_role(raw_role: str | None) -> str:
    role = (raw_role or "user").strip().lower()
    if role in {"user", "consumer"}:
        return "consumer"
    if role in {"provider", "pro"}:
        return "provider"
    if role == "admin":
        return "admin"
    raise HTTPException(
        status_code=400,
        detail="Invalid role. Use one of: user, consumer, provider, admin.",
    )


@router.post("/signup")
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="User already exists")

    # Normalize role
    role = _normalize_role(payload.role)

    # Create user
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If user is a provider, create provider profile automatically
    if role == "provider":
        provider = Provider(
            user_id=user.id,
            bio=f"Hi, I'm {user.name}! I'm here to help with various services.",
            skills="",  # Will be updated later by the user
            lat=0.0,    # Will be updated later by the user
            lng=0.0,    # Will be updated later by the user
            radius_km=5.0  # Default 5km radius
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)

    # Issue token
    token = create_access_token(user)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
        },
    }


@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token(user)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
        },
    }


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = (file.filename or 'img').split('.')[-1]
    fname = f"avatar_{current_user.id}_{os.urandom(4).hex()}.{ext}"
    path = os.path.join(settings.UPLOAD_DIR, fname)
    with open(path, 'wb') as f:
        f.write(file.file.read())
    # public URL via static mount
    public_url = f"/uploads/{fname}"
    current_user.avatar_url = public_url
    db.commit()
    db.refresh(current_user)
    return current_user
