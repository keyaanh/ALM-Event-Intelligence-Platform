from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from database import supabase_admin
from models.schemas import LoginRequest, RegisterRequest, TokenResponse
import os

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 480))


def create_token(user_id: str, role: str, full_name: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "full_name": full_name,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload["sub"], "role": payload["role"], "full_name": payload["full_name"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_role(*roles):
    def checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    # Check if user already exists
    existing = supabase_admin.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = pwd_context.hash(body.password)

    result = supabase_admin.table("users").insert({
        "email": body.email,
        "full_name": body.full_name,
        "role": body.role,
        "hashed_password": hashed_pw
    }).execute()

    user = result.data[0]
    token = create_token(user["id"], user["role"], user["full_name"])

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        role=user["role"],
        full_name=user["full_name"]
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    result = supabase_admin.table("users").select("*").eq("email", body.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data[0]
    if not pwd_context.verify(body.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["role"], user["full_name"])

    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        role=user["role"],
        full_name=user["full_name"]
    )


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    result = supabase_admin.table("users").select("id,email,full_name,role,created_at").eq("id", current_user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]
