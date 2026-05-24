# 재고/자재현황 API 라우터 - 2026-05-23
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from bson import ObjectId
import re

router = APIRouter(prefix="/api/inventory", tags=["재고"])


class TxnCreate(BaseModel):
    txn_type:  str = Field(..., pattern="^(IN|OUT|ADJUST)$")
    item_code: str
    item_name: str
    quantity:  float = Field(..., gt=0)
    unit:      str = "EA"
    ref_type:  str = "MANUAL"
    ref_id:    str = ""
    txn_date:  str
    note:      str = ""


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def _next_txn_id(db) -> str:
    prefix = f"TX-{date.today().isoformat().replace('-', '')}-"
    last = await db.inventory_txns.find_one(
        {"txn_id": {"$regex": f"^{re.escape(prefix)}"}},
        sort=[("txn_id", -1)]
    )
    seq = int(last["txn_id"].split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


async def ensure_indexes(db):
    await db.inventory.create_index("item_code", unique=True)
    await db.inventory_txns.create_index("txn_id", unique=True)
    await db.inventory_txns.create_index("item_code")
    await db.inventory_txns.create_index("txn_date")


# ── 재고현황 (품목 기준 전체 조회) ─────────────────────────
@router.get("")
async def list_inventory(
    request:   Request,
    item_type: Optional[str] = Query(None),
    item_code: Optional[str] = Query(None),
    item_name: Optional[str] = Query(None),
):
    db = request.app.state.db

    # 활성 품목 목록 로드
    items_list = await db.items.find({"active": True}).sort("code", 1).to_list(length=None)

    # 재고 스냅샷 로드
    inv_docs = await db.inventory.find({}).to_list(length=None)
    inv_map  = {d["item_code"]: d for d in inv_docs}

    result = []
    for item in items_list:
        code = item["code"]
        inv  = inv_map.get(code, {})
        stock = {
            "_id":           str(inv["_id"]) if inv.get("_id") else "",
            "item_code":     code,
            "item_name":     item["name"],
            "item_type":     item["item_type"],
            "unit":          item.get("unit", "EA"),
            "current_stock": inv.get("current_stock", 0),
            "safety_stock":  item.get("safety_stock", 0),
            "min_stock":     item.get("min_stock", 0),
            "max_stock":     item.get("max_stock", 0),
            "last_updated":  str(inv["last_updated"]) if inv.get("last_updated") else None,
        }
        # 검색 필터 적용
        if item_type and item_type != "ALL" and item["item_type"] != item_type:
            continue
        if item_code and item_code.lower() not in code.lower():
            continue
        if item_name and item_name.lower() not in item["name"].lower():
            continue
        result.append(stock)

    return {"data": result, "total": len(result)}


# ── 입출고 이력 조회 ────────────────────────────────────────
@router.get("/txns")
async def list_txns(
    request:    Request,
    item_code:  Optional[str] = Query(None),
    txn_type:   Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date:   Optional[str] = Query(None),
):
    db    = request.app.state.db
    query = {}
    if item_code:
        query["item_code"] = {"$regex": item_code, "$options": "i"}
    if txn_type and txn_type != "ALL":
        query["txn_type"] = txn_type
    if start_date or end_date:
        df = {}
        if start_date: df["$gte"] = start_date
        if end_date:   df["$lte"] = end_date
        query["txn_date"] = df

    cursor = db.inventory_txns.find(query).sort("created_at", -1).limit(500)
    docs   = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


# ── 개발용: 전체 초기화 ─────────────────────────────────────
@router.delete("/reset", status_code=204)
async def reset_inventory(request: Request):
    db = request.app.state.db
    await db.inventory.delete_many({})
    await db.inventory_txns.delete_many({})

# ── 입출고 등록 ─────────────────────────────────────────────
@router.post("/txns", status_code=201)
async def create_txn(request: Request, body: TxnCreate):
    db     = request.app.state.db
    txn_id = await _next_txn_id(db)

    delta = body.quantity if body.txn_type == "IN" else -body.quantity if body.txn_type == "OUT" else 0

    await db.inventory.update_one(
        {"item_code": body.item_code},
        {
            "$inc": {"current_stock": delta},
            "$set": {
                "item_name":    body.item_name,
                "unit":         body.unit,
                "last_updated": datetime.utcnow(),
            },
            "$setOnInsert": {
                "item_type":    "RAW",
                "safety_stock": 0,
                "created_at":   datetime.utcnow(),
            },
        },
        upsert=True,
    )

    doc    = {**body.model_dump(), "txn_id": txn_id, "created_at": datetime.utcnow()}
    result = await db.inventory_txns.insert_one(doc)
    created = await db.inventory_txns.find_one({"_id": result.inserted_id})
    return _serialize(created)
