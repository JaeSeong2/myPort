# 품목 API 라우터 - 2026-05-23
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/items", tags=["품목"])

ITEM_TYPES = {"FINISHED", "SEMI", "RAW", "CONSUMABLE"}


# ── Pydantic 모델 ──────────────────────────────────────────
class ItemCreate(BaseModel):
    code:         str
    name:         str
    item_type:    str = Field(..., pattern="^(FINISHED|SEMI|RAW|CONSUMABLE)$")
    unit:         str = "EA"
    spec:         Optional[str] = ""
    drawing_no:   Optional[str] = ""
    unit_price:   Optional[float] = 0
    min_stock:    Optional[float] = 0
    max_stock:    Optional[float] = 0
    safety_stock: Optional[float] = 0
    active:       bool = True
    note:         Optional[str] = ""


class ItemUpdate(BaseModel):
    name:         Optional[str] = None
    item_type:    Optional[str] = Field(None, pattern="^(FINISHED|SEMI|RAW|CONSUMABLE)$")
    unit:         Optional[str] = None
    spec:         Optional[str] = None
    drawing_no:   Optional[str] = None
    unit_price:   Optional[float] = None
    min_stock:    Optional[float] = None
    max_stock:    Optional[float] = None
    safety_stock: Optional[float] = None
    active:       Optional[bool] = None
    note:         Optional[str] = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def ensure_indexes(db):
    await db.items.create_index("code", unique=True)
    await db.items.create_index("item_type")
    await db.items.create_index("active")


# ── GET /api/items ────────────────────────────────────────
@router.get("")
async def list_items(
    request:     Request,
    item_type:   Optional[str] = Query(None),
    code:        Optional[str] = Query(None),
    name:        Optional[str] = Query(None),
    active_only: bool          = Query(False),
):
    db = request.app.state.db
    query = {}
    if item_type and item_type != "ALL": query["item_type"] = item_type
    if code:        query["code"] = {"$regex": code, "$options": "i"}
    if name:        query["name"] = {"$regex": name, "$options": "i"}
    if active_only: query["active"] = True

    cursor = db.items.find(query).sort("code", 1)
    docs = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


# ── POST /api/items ───────────────────────────────────────
@router.post("", status_code=201)
async def create_item(request: Request, body: ItemCreate):
    db = request.app.state.db
    if await db.items.find_one({"code": body.code}):
        raise HTTPException(status_code=409, detail="동일한 품목코드가 이미 존재합니다.")
    doc = {
        **body.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result  = await db.items.insert_one(doc)
    created = await db.items.find_one({"_id": result.inserted_id})
    return _serialize(created)


# ── PUT /api/items/{id} ───────────────────────────────────
@router.put("/{doc_id}")
async def update_item(request: Request, doc_id: str, body: ItemUpdate):
    db = request.app.state.db
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")
    updates["updated_at"] = datetime.utcnow()
    result = await db.items.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="품목을 찾을 수 없습니다.")
    updated = await db.items.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


# ── DELETE /api/items/{id} ────────────────────────────────
@router.delete("/{doc_id}", status_code=204)
async def delete_item(request: Request, doc_id: str):
    db = request.app.state.db
    result = await db.items.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="품목을 찾을 수 없습니다.")
