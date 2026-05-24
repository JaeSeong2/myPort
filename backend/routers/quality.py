# 품질검사 API 라우터 - 2026-05-23
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from bson import ObjectId
import re

router = APIRouter(prefix="/api/quality", tags=["품질검사"])


class InspectionCreate(BaseModel):
    order_id:     str = ""
    product_code: str
    product_name: str
    inspect_type: str = Field(..., pattern="^(INCOMING|IN_PROCESS|FINAL)$")
    quantity:     float = Field(..., gt=0)
    passed:       float = Field(..., ge=0)
    failed:       float = Field(0,  ge=0)
    inspector:    str
    inspect_date: str
    note:         str = ""


class InspectionUpdate(BaseModel):
    passed:       Optional[float] = None
    failed:       Optional[float] = None
    inspector:    Optional[str]   = None
    inspect_date: Optional[str]   = None
    note:         Optional[str]   = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


def _result(passed: float, failed: float, quantity: float) -> str:
    if failed == 0:
        return "PASS"
    if failed / quantity <= 0.05:
        return "CONDITIONAL"
    return "FAIL"


async def _next_id(db, today: str) -> str:
    prefix = f"QI-{today.replace('-', '')}-"
    last   = await db.inspections.find_one(
        {"inspect_id": {"$regex": f"^{re.escape(prefix)}"}},
        sort=[("inspect_id", -1)]
    )
    seq = int(last["inspect_id"].split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


async def ensure_indexes(db):
    await db.inspections.create_index("inspect_id", unique=True)
    await db.inspections.create_index("product_code")
    await db.inspections.create_index("inspect_date")


@router.get("")
async def list_inspections(
    request:      Request,
    product_code: Optional[str] = Query(None),
    inspect_type: Optional[str] = Query(None),
    result:       Optional[str] = Query(None),
    start_date:   Optional[str] = Query(None),
    end_date:     Optional[str] = Query(None),
):
    db    = request.app.state.db
    query = {}
    if product_code and product_code != "ALL":
        query["product_code"] = product_code
    if inspect_type and inspect_type != "ALL":
        query["inspect_type"] = inspect_type
    if result and result != "ALL":
        query["result"] = result
    if start_date or end_date:
        df = {}
        if start_date: df["$gte"] = start_date
        if end_date:   df["$lte"] = end_date
        query["inspect_date"] = df

    cursor = db.inspections.find(query).sort("created_at", -1).limit(300)
    docs   = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


@router.post("", status_code=201)
async def create_inspection(request: Request, body: InspectionCreate):
    db         = request.app.state.db
    today      = date.today().isoformat()
    inspect_id = await _next_id(db, today)
    pass_rate  = round((body.passed / body.quantity) * 100, 1) if body.quantity else 0
    doc = {
        **body.model_dump(),
        "inspect_id": inspect_id,
        "pass_rate":  pass_rate,
        "result":     _result(body.passed, body.failed, body.quantity),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result  = await db.inspections.insert_one(doc)
    created = await db.inspections.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.put("/{doc_id}")
async def update_inspection(request: Request, doc_id: str, body: InspectionUpdate):
    db      = request.app.state.db
    current = await db.inspections.find_one({"_id": ObjectId(doc_id)})
    if not current:
        raise HTTPException(status_code=404, detail="검사 기록을 찾을 수 없습니다.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    passed   = updates.get("passed",  current["passed"])
    failed   = updates.get("failed",  current.get("failed", 0))
    quantity = current["quantity"]
    updates["pass_rate"]  = round((passed / quantity) * 100, 1) if quantity else 0
    updates["result"]     = _result(passed, failed, quantity)
    updates["updated_at"] = datetime.utcnow()

    await db.inspections.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    updated = await db.inspections.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


@router.delete("/{doc_id}", status_code=204)
async def delete_inspection(request: Request, doc_id: str):
    db     = request.app.state.db
    result = await db.inspections.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="검사 기록을 찾을 수 없습니다.")
