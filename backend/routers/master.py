# 기초정보 API 라우터 - 2026-05-23
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/master", tags=["기초정보"])

CATEGORIES = {"process", "employee"}  # item은 items 컬렉션으로 분리


class MasterCreate(BaseModel):
    category: str = Field(..., pattern="^(item|process|employee)$")
    code:     str
    name:     str
    active:   bool = True


class MasterUpdate(BaseModel):
    code:   Optional[str] = None
    name:   Optional[str] = None
    active: Optional[bool] = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def ensure_indexes(db):
    await db.master_data.create_index([("category", 1), ("code", 1)], unique=True)
    await db.master_data.create_index("active")


# ── GET /api/master?category=item&active_only=true ────────
@router.get("")
async def list_master(
    request:     Request,
    category:    str  = Query(...),
    active_only: bool = Query(False),
):
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category는 {CATEGORIES} 중 하나여야 합니다.")
    db = request.app.state.db
    query = {"category": category}
    if active_only:
        query["active"] = True
    cursor = db.master_data.find(query).sort("code", 1)
    docs = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


# ── POST /api/master ──────────────────────────────────────
@router.post("", status_code=201)
async def create_master(request: Request, body: MasterCreate):
    db = request.app.state.db
    existing = await db.master_data.find_one({"category": body.category, "code": body.code})
    if existing:
        raise HTTPException(status_code=409, detail="동일한 코드가 이미 존재합니다.")
    doc = {
        **body.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.master_data.insert_one(doc)
    created = await db.master_data.find_one({"_id": result.inserted_id})
    return _serialize(created)


# ── PUT /api/master/{id} ──────────────────────────────────
@router.put("/{doc_id}")
async def update_master(request: Request, doc_id: str, body: MasterUpdate):
    db = request.app.state.db
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")
    updates["updated_at"] = datetime.utcnow()
    result = await db.master_data.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    updated = await db.master_data.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


# ── DELETE /api/master/{id} ───────────────────────────────
@router.delete("/{doc_id}", status_code=204)
async def delete_master(request: Request, doc_id: str):
    db = request.app.state.db
    result = await db.master_data.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
