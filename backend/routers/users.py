# 사용자 권한 API 라우터 - 2026-05-24
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from security import pwd_ctx

router = APIRouter(prefix="/api/users", tags=["사용자"])
DEFAULT_PW = os.getenv("DEFAULT_PASSWORD", "MES@2024")


class ActionsSchema(BaseModel):
    add:        bool = True
    edit:       bool = True
    delete:     bool = True
    excel_up:   bool = True
    excel_down: bool = True


class UserCreate(BaseModel):
    user_id:  str
    name:     str
    role:     str = Field(..., pattern="^(ADMIN|USER)$")
    email:    Optional[str] = ""
    menus:    List[str] = []
    actions:  ActionsSchema = ActionsSchema()
    active:   bool = True
    password: Optional[str] = None  # 미입력 시 DEFAULT_PASSWORD 사용


class UserUpdate(BaseModel):
    name:     Optional[str] = None
    role:     Optional[str] = Field(None, pattern="^(ADMIN|USER)$")
    email:    Optional[str] = None
    menus:    Optional[List[str]] = None
    actions:  Optional[ActionsSchema] = None
    active:   Optional[bool] = None
    password: Optional[str] = None  # 변경 시에만 입력


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    doc.pop("password_hash", None)
    return doc


async def ensure_indexes(db):
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("role")


@router.get("")
async def list_users(
    request:     Request,
    role:        Optional[str] = Query(None),
    active_only: bool          = Query(False),
):
    db = request.app.state.db
    query = {}
    if role:        query["role"]   = role
    if active_only: query["active"] = True
    cursor = db.users.find(query).sort("created_at", 1)
    docs = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


@router.post("", status_code=201)
async def create_user(request: Request, body: UserCreate):
    db  = request.app.state.db
    raw = body.model_dump(exclude={"password"})
    doc = {
        **raw,
        "actions":       body.actions.model_dump(),
        "password_hash": pwd_ctx.hash(body.password or DEFAULT_PW),
        "created_at":    datetime.utcnow(),
        "updated_at":    datetime.utcnow(),
    }
    result  = await db.users.insert_one(doc)
    created = await db.users.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.put("/{doc_id}")
async def update_user(request: Request, doc_id: str, body: UserUpdate):
    db = request.app.state.db
    updates = {}
    data = body.model_dump(exclude={"password"})
    for k, v in data.items():
        if v is None:
            continue
        if k == "actions" and isinstance(v, dict):
            updates["actions"] = v
        else:
            updates[k] = v
    if body.password:
        updates["password_hash"] = pwd_ctx.hash(body.password)
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")
    updates["updated_at"] = datetime.utcnow()
    result = await db.users.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    updated = await db.users.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


@router.delete("/{doc_id}", status_code=204)
async def delete_user(request: Request, doc_id: str):
    db = request.app.state.db
    result = await db.users.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
