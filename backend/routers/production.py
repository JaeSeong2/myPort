# 생산실적 API 라우터 - 2026-05-23
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from bson import ObjectId
import re

router = APIRouter(prefix="/api/productions", tags=["생산실적"])


class ProductionCreate(BaseModel):
    order_id:     str
    product_code: str
    product_name: str
    planned_qty:  float = Field(..., ge=0)
    actual_qty:   float = Field(..., ge=0)
    defect_qty:   float = Field(0, ge=0)
    process_code: str = ""
    worker_code:  str = ""
    work_date:    str
    start_time:   str = ""
    end_time:     str = ""
    note:         str = ""


class ProductionUpdate(BaseModel):
    actual_qty:   Optional[float] = None
    defect_qty:   Optional[float] = None
    process_code: Optional[str]   = None
    worker_code:  Optional[str]   = None
    work_date:    Optional[str]   = None
    start_time:   Optional[str]   = None
    end_time:     Optional[str]   = None
    note:         Optional[str]   = None
    status:       Optional[str]   = Field(None, pattern="^(ONGOING|COMPLETED)$")


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def _next_prod_id(db, today: str) -> str:
    prefix = f"PR-{today.replace('-', '')}-"
    last = await db.productions.find_one(
        {"prod_id": {"$regex": f"^{re.escape(prefix)}"}},
        sort=[("prod_id", -1)]
    )
    seq = int(last["prod_id"].split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


async def _next_txn_id(db) -> str:
    prefix = f"TX-{date.today().isoformat().replace('-', '')}-"
    last = await db.inventory_txns.find_one(
        {"txn_id": {"$regex": f"^{re.escape(prefix)}"}},
        sort=[("txn_id", -1)]
    )
    seq = int(last["txn_id"].split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


async def ensure_indexes(db):
    await db.productions.create_index("prod_id", unique=True)
    await db.productions.create_index("order_id")
    await db.productions.create_index("work_date")
    await db.productions.create_index("status")


@router.get("")
async def list_productions(
    request:      Request,
    order_id:     Optional[str] = Query(None),
    product_code: Optional[str] = Query(None),
    status:       Optional[str] = Query(None),
    start_date:   Optional[str] = Query(None),
    end_date:     Optional[str] = Query(None),
):
    db = request.app.state.db
    query = {}
    if order_id:
        query["order_id"] = {"$regex": order_id, "$options": "i"}
    if product_code and product_code != "ALL":
        query["product_code"] = product_code
    if status and status != "ALL":
        query["status"] = status
    if start_date or end_date:
        df = {}
        if start_date: df["$gte"] = start_date
        if end_date:   df["$lte"] = end_date
        query["work_date"] = df

    cursor = db.productions.find(query).sort("created_at", -1).limit(200)
    docs = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


@router.post("", status_code=201)
async def create_production(request: Request, body: ProductionCreate):
    db = request.app.state.db
    today = date.today().isoformat()
    prod_id = await _next_prod_id(db, today)

    doc = {
        **body.model_dump(),
        "prod_id":    prod_id,
        "good_qty":   max(0.0, body.actual_qty - body.defect_qty),
        "status":     "ONGOING",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    # PENDING 작업지시 → 진행중으로 전환
    await db.work_orders.update_one(
        {"order_id": body.order_id, "status": "PENDING"},
        {"$set": {"status": "IN_PROG", "actual_start": today, "updated_at": datetime.utcnow()}}
    )
    result  = await db.productions.insert_one(doc)
    created = await db.productions.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.put("/{doc_id}")
async def update_production(request: Request, doc_id: str, body: ProductionUpdate):
    db      = request.app.state.db
    current = await db.productions.find_one({"_id": ObjectId(doc_id)})
    if not current:
        raise HTTPException(status_code=404, detail="실적을 찾을 수 없습니다.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")

    actual_qty = updates.get("actual_qty", current["actual_qty"])
    defect_qty = updates.get("defect_qty", current.get("defect_qty", 0))
    updates["good_qty"]   = max(0.0, actual_qty - defect_qty)
    updates["updated_at"] = datetime.utcnow()

    # 완료 처리: 작업지시 DONE + 완제품 입고
    if updates.get("status") == "COMPLETED" and current["status"] != "COMPLETED":
        today = date.today().isoformat()
        await db.work_orders.update_one(
            {"order_id": current["order_id"]},
            {"$set": {"status": "DONE", "actual_end": today, "updated_at": datetime.utcnow()}}
        )
        await _stock_in(db, current["product_code"], current["product_name"],
                        updates["good_qty"], current["prod_id"])

    await db.productions.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    updated = await db.productions.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


@router.delete("/{doc_id}", status_code=204)
async def delete_production(request: Request, doc_id: str):
    db     = request.app.state.db
    result = await db.productions.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="실적을 찾을 수 없습니다.")


async def _stock_in(db, item_code: str, item_name: str, qty: float, ref_id: str):
    """생산완료 시 완제품 재고 입고"""
    item = await db.items.find_one({"code": item_code})
    unit = item.get("unit", "EA") if item else "EA"

    await db.inventory.update_one(
        {"item_code": item_code},
        {
            "$inc": {"current_stock": qty},
            "$set": {"item_name": item_name, "unit": unit, "last_updated": datetime.utcnow()},
            "$setOnInsert": {"item_type": "FINISHED", "safety_stock": 0, "created_at": datetime.utcnow()},
        },
        upsert=True,
    )

    txn_id = await _next_txn_id(db)
    await db.inventory_txns.insert_one({
        "txn_id":    txn_id,
        "txn_type":  "IN",
        "item_code": item_code,
        "item_name": item_name,
        "quantity":  qty,
        "unit":      unit,
        "ref_type":  "PRODUCTION",
        "ref_id":    ref_id,
        "txn_date":  date.today().isoformat(),
        "note":      f"생산실적 완료: {ref_id}",
        "created_at": datetime.utcnow(),
    })
