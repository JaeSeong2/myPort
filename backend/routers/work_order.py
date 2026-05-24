# 작업지시 API 라우터 - 2026-05-23
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from bson import ObjectId
import re

router = APIRouter(prefix="/api/work-orders", tags=["작업지시"])


# ── Pydantic 모델 ──────────────────────────────────────────
class WorkOrderCreate(BaseModel):
    type:          str = Field(..., pattern="^(NORMAL|URGENT|REWORK)$")
    priority:      str = Field(..., pattern="^(HIGH|MEDIUM|LOW)$")
    product_code:  str
    product_name:  str
    quantity:      float = Field(..., gt=0)
    unit:          str
    planned_start: str   # YYYY-MM-DD
    planned_end:   str
    assignee:      str
    process_code:  str
    note:          Optional[str] = ""


class WorkOrderUpdate(BaseModel):
    type:          Optional[str] = None
    status:        Optional[str] = Field(None, pattern="^(PENDING|IN_PROG|STOPPED|DONE)$")
    priority:      Optional[str] = None
    product_code:  Optional[str] = None
    product_name:  Optional[str] = None
    quantity:      Optional[float] = None
    unit:          Optional[str] = None
    planned_start: Optional[str] = None
    planned_end:   Optional[str] = None
    actual_start:  Optional[str] = None
    actual_end:    Optional[str] = None
    assignee:      Optional[str] = None
    process_code:  Optional[str] = None
    note:          Optional[str] = None


# ── ObjectId 직렬화 헬퍼 ──────────────────────────────────
def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


# ── 지시번호 자동 생성 ────────────────────────────────────
async def _next_order_id(db, today: str) -> str:
    prefix = f"WO-{today.replace('-', '')}-"
    last = await db.work_orders.find_one(
        {"order_id": {"$regex": f"^{re.escape(prefix)}"}},
        sort=[("order_id", -1)]
    )
    seq = 1
    if last:
        seq = int(last["order_id"].split("-")[-1]) + 1
    return f"{prefix}{seq:04d}"


# ── 인덱스 초기화 (앱 시작 시 1회) ───────────────────────
async def ensure_indexes(db):
    await db.work_orders.create_index("order_id", unique=True)
    await db.work_orders.create_index("status")
    await db.work_orders.create_index([("planned_start", 1), ("planned_end", 1)])


# ── GET /api/work-orders ──────────────────────────────────
@router.get("")
async def list_work_orders(
    request: Request,
    status:       Optional[str] = Query(None),
    type:         Optional[str] = Query(None),
    order_id:     Optional[str] = Query(None),
    product_code: Optional[str] = Query(None),
    start_date:   Optional[str] = Query(None),
    end_date:     Optional[str] = Query(None),
):
    db = request.app.state.db
    query = {}

    if status and status != "ALL":
        query["status"] = status
    if type and type != "ALL":
        query["type"] = type
    if order_id:
        query["order_id"] = {"$regex": order_id, "$options": "i"}
    if product_code and product_code != "ALL":
        query["product_code"] = product_code
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        query["planned_start"] = date_filter

    cursor = db.work_orders.find(query).sort("created_at", -1).limit(200)
    docs = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


# ── POST /api/work-orders ─────────────────────────────────
@router.post("", status_code=201)
async def create_work_order(request: Request, body: WorkOrderCreate):
    db = request.app.state.db
    today = date.today().isoformat()
    order_id = await _next_order_id(db, today)

    doc = {
        **body.model_dump(),
        "order_id": order_id,
        "status":   "PENDING",
        "actual_start": None,
        "actual_end":   None,
        "created_at":   datetime.utcnow(),
        "updated_at":   datetime.utcnow(),
    }
    result = await db.work_orders.insert_one(doc)
    created = await db.work_orders.find_one({"_id": result.inserted_id})
    return _serialize(created)


# ── PUT /api/work-orders/{id} ─────────────────────────────
@router.put("/{doc_id}")
async def update_work_order(request: Request, doc_id: str, body: WorkOrderUpdate):
    db = request.app.state.db
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")

    updates["updated_at"] = datetime.utcnow()
    result = await db.work_orders.update_one(
        {"_id": ObjectId(doc_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="작업지시를 찾을 수 없습니다.")

    updated = await db.work_orders.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


# ── DELETE /api/work-orders/{id} ──────────────────────────
@router.delete("/{doc_id}", status_code=204)
async def delete_work_order(request: Request, doc_id: str):
    db = request.app.state.db
    result = await db.work_orders.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="작업지시를 찾을 수 없습니다.")
