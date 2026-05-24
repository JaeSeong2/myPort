# 인증 라우터 - 2026-05-24
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from jose import jwt
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from security import pwd_ctx

router = APIRouter(prefix="/api/auth", tags=["인증"])

SECRET       = os.getenv("JWT_SECRET", "change-me-before-deploy")
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))
DEFAULT_PW   = os.getenv("DEFAULT_PASSWORD", "MES@2024")


class LoginBody(BaseModel):
    user_id:  str
    password: str


@router.post("/login")
async def login(request: Request, body: LoginBody):
    """
    사용자 로그인 - ID/비밀번호 검증 후 JWT 발급
    기존 사용자(password_hash 없음)는 DEFAULT_PASSWORD로 로그인 가능
    @date 2026-05-24
    """
    db   = request.app.state.db
    user = await db.users.find_one({"user_id": body.user_id.upper(), "active": True})
    if not user:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    pw_hash = user.get("password_hash", "")
    ok = pwd_ctx.verify(body.password, pw_hash) if pw_hash else (body.password == DEFAULT_PW)
    if not ok:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    exp   = datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS)
    token = jwt.encode(
        {"sub": str(user["_id"]), "uid": user["user_id"], "role": user["role"], "exp": exp},
        SECRET, algorithm="HS256",
    )
    return {
        "token": token,
        "user": {
            "_id":     str(user["_id"]),
            "user_id": user["user_id"],
            "name":    user["name"],
            "role":    user["role"],
            "menus":   user.get("menus", []),
            "actions": user.get("actions", {}),
            "active":  user.get("active", True),
        },
    }
