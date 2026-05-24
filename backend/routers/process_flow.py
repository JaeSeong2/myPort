# 공정 흐름 API 라우터 - 2026-05-24
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/process-flow", tags=["공정흐름"])


class FlowCreate(BaseModel):
    product_code:  str
    process_code:  str
    process_name:  str
    sequence:      int
    cycle_time:    Optional[float] = 0
    note:          Optional[str] = ""


class FlowUpdate(BaseModel):
    process_name:  Optional[str] = None
    sequence:      Optional[int] = None
    cycle_time:    Optional[float] = None
    note:          Optional[str] = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def ensure_indexes(db):
    await db.process_flow.create_index([("product_code", 1), ("process_code", 1)], unique=True)
    await db.process_flow.create_index([("product_code", 1), ("sequence", 1)])


# ── GET /api/process-flow?product_code=xxx ────────────────
@router.get("")
async def list_flow(
    request:      Request,
    product_code: Optional[str] = Query(None),
):
    db = request.app.state.db
    query = {}
    if product_code: query["product_code"] = product_code
    cursor = db.process_flow.find(query).sort([("product_code", 1), ("sequence", 1)])
    docs = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


# ── POST /api/process-flow ────────────────────────────────
@router.post("", status_code=201)
async def create_flow(request: Request, body: FlowCreate):
    db = request.app.state.db
    existing = await db.process_flow.find_one(
        {"product_code": body.product_code, "process_code": body.process_code}
    )
    if existing:
        raise HTTPException(status_code=409, detail="해당 제품에 이미 등록된 공정입니다.")
    doc = {
        **body.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result  = await db.process_flow.insert_one(doc)
    created = await db.process_flow.find_one({"_id": result.inserted_id})
    return _serialize(created)


# ── PUT /api/process-flow/{id} ────────────────────────────
@router.put("/{doc_id}")
async def update_flow(request: Request, doc_id: str, body: FlowUpdate):
    db = request.app.state.db
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")
    updates["updated_at"] = datetime.utcnow()
    result = await db.process_flow.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="공정 흐름 항목을 찾을 수 없습니다.")
    updated = await db.process_flow.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


# ── DELETE /api/process-flow/{id} ────────────────────────
@router.delete("/{doc_id}", status_code=204)
async def delete_flow(request: Request, doc_id: str):
    db = request.app.state.db
    result = await db.process_flow.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="공정 흐름 항목을 찾을 수 없습니다.")
