# LOT 추적 API 라우터 - 2026-05-25
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from bson import ObjectId
import re

router = APIRouter(prefix="/api/lots", tags=["LOT추적"])


class LotCreate(BaseModel):
    order_id:     str
    product_code: str
    product_name: str
    planned_qty:  float = Field(..., gt=0)
    note:         Optional[str] = ""


class LotUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(CREATED|IN_PROGRESS|COMPLETED|ON_HOLD)$")
    note:   Optional[str] = None


class LogUpdate(BaseModel):
    status:       Optional[str] = Field(None, pattern="^(PENDING|IN_PROGRESS|COMPLETED|SKIPPED)$")
    started_at:   Optional[str] = None
    completed_at: Optional[str] = None
    worker_code:  Optional[str] = None
    actual_qty:   Optional[float] = None
    defect_qty:   Optional[float] = None
    note:         Optional[str] = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def _next_lot_no(db, today: str) -> str:
    prefix = f"LT-{today.replace('-', '')}-"
    last = await db.lots.find_one(
        {"lot_no": {"$regex": f"^{re.escape(prefix)}"}},
        sort=[("lot_no", -1)]
    )
    seq = int(last["lot_no"].split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"


async def ensure_indexes(db):
    await db.lots.create_index("lot_no", unique=True)
    await db.lots.create_index("order_id")
    await db.lots.create_index("status")
    await db.lots.create_index("product_code")
    await db.lot_process_logs.create_index("lot_no")
    await db.lot_process_logs.create_index([("lot_no", 1), ("sequence", 1)])


# ── GET /api/lots ─────────────────────────────────────────
@router.get("")
async def list_lots(
    request:      Request,
    status:       Optional[str] = Query(None),
    product_code: Optional[str] = Query(None),
    lot_no:       Optional[str] = Query(None),
    start_date:   Optional[str] = Query(None),
    end_date:     Optional[str] = Query(None),
):
    db    = request.app.state.db
    query = {}
    if status and status != "ALL":             query["status"]       = status
    if product_code and product_code != "ALL": query["product_code"] = product_code
    if lot_no:  query["lot_no"] = {"$regex": lot_no, "$options": "i"}
    if start_date or end_date:
        df = {}
        if start_date: df["$gte"] = start_date
        if end_date:   df["$lte"] = end_date
        query["opened_at"] = df

    cursor = db.lots.find(query).sort("created_at", -1).limit(200)
    docs   = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


# ── POST /api/lots ────────────────────────────────────────
@router.post("", status_code=201)
async def create_lot(request: Request, body: LotCreate):
    db     = request.app.state.db
    today  = date.today().isoformat()
    lot_no = await _next_lot_no(db, today)

    # process_flow 기반으로 공정 로그 자동 생성
    flow_cursor = db.process_flow.find({"product_code": body.product_code}).sort("sequence", 1)
    flow_steps  = [doc async for doc in flow_cursor]
    first       = flow_steps[0] if flow_steps else None

    doc = {
        **body.model_dump(),
        "lot_no":               lot_no,
        "status":               "CREATED",
        "current_sequence":     first["sequence"]     if first else 0,
        "current_process_code": first["process_code"] if first else "",
        "current_process_name": first["process_name"] if first else "",
        "opened_at":            today,
        "closed_at":            None,
        "created_at":           datetime.utcnow(),
        "updated_at":           datetime.utcnow(),
    }
    result  = await db.lots.insert_one(doc)
    created = await db.lots.find_one({"_id": result.inserted_id})

    if flow_steps:
        logs = [{
            "lot_no":       lot_no,
            "process_code": step["process_code"],
            "process_name": step["process_name"],
            "sequence":     step["sequence"],
            "status":       "PENDING",
            "started_at":   None,
            "completed_at": None,
            "worker_code":  "",
            "actual_qty":   None,
            "defect_qty":   None,
            "good_qty":     None,
            "note":         "",
            "created_at":   datetime.utcnow(),
            "updated_at":   datetime.utcnow(),
        } for step in flow_steps]
        await db.lot_process_logs.insert_many(logs)

    return _serialize(created)


# ── GET /api/lots/{lot_no}/detail ─────────────────────────
@router.get("/{lot_no}/detail")
async def get_lot_detail(request: Request, lot_no: str):
    db  = request.app.state.db
    lot = await db.lots.find_one({"lot_no": lot_no})
    if not lot:
        raise HTTPException(status_code=404, detail="LOT를 찾을 수 없습니다.")

    log_cursor  = db.lot_process_logs.find({"lot_no": lot_no}).sort("sequence", 1)
    logs        = [_serialize(doc) async for doc in log_cursor]

    prod_cursor = db.productions.find({"lot_no": lot_no}).sort("created_at", -1)
    prods       = [_serialize(doc) async for doc in prod_cursor]

    qa_cursor   = db.inspections.find({"lot_no": lot_no}).sort("created_at", -1)
    qas         = [_serialize(doc) async for doc in qa_cursor]

    return {
        "lot":          _serialize(lot),
        "process_logs": logs,
        "productions":  prods,
        "inspections":  qas,
    }


# ── PUT /api/lots/{lot_no} ────────────────────────────────
@router.put("/{lot_no}")
async def update_lot(request: Request, lot_no: str, body: LotUpdate):
    db      = request.app.state.db
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")
    updates["updated_at"] = datetime.utcnow()
    result = await db.lots.update_one({"lot_no": lot_no}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="LOT를 찾을 수 없습니다.")
    updated = await db.lots.find_one({"lot_no": lot_no})
    return _serialize(updated)


# ── PUT /api/lots/{lot_no}/logs/{log_id} ─────────────────
@router.put("/{lot_no}/logs/{log_id}")
async def update_lot_log(request: Request, lot_no: str, log_id: str, body: LogUpdate):
    db      = request.app.state.db
    current = await db.lot_process_logs.find_one({"_id": ObjectId(log_id), "lot_no": lot_no})
    if not current:
        raise HTTPException(status_code=404, detail="공정 로그를 찾을 수 없습니다.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    if updates.get("status") == "IN_PROGRESS" and not updates.get("started_at"):
        updates["started_at"] = datetime.utcnow().isoformat()
    if updates.get("status") == "COMPLETED" and not updates.get("completed_at"):
        updates["completed_at"] = datetime.utcnow().isoformat()

    actual = updates.get("actual_qty", current.get("actual_qty")) or 0
    defect = updates.get("defect_qty", current.get("defect_qty")) or 0
    if "actual_qty" in updates or "defect_qty" in updates:
        updates["good_qty"] = max(0.0, actual - defect)

    updates["updated_at"] = datetime.utcnow()
    await db.lot_process_logs.update_one({"_id": ObjectId(log_id)}, {"$set": updates})
    await _sync_lot_status(db, lot_no)

    updated = await db.lot_process_logs.find_one({"_id": ObjectId(log_id)})
    return _serialize(updated)


async def _sync_lot_status(db, lot_no: str):
    """공정 로그 상태 변경 시 LOT 상태 자동 동기화 - 2026-05-25"""
    logs = await db.lot_process_logs.find({"lot_no": lot_no}).sort("sequence", 1).to_list(None)
    if not logs:
        return

    statuses    = [l["status"] for l in logs]
    all_done    = all(s in ("COMPLETED", "SKIPPED") for s in statuses)
    any_started = any(s in ("IN_PROGRESS", "COMPLETED") for s in statuses)
    current     = next((l for l in logs if l["status"] == "IN_PROGRESS"), None) or \
                  next((l for l in logs if l["status"] == "PENDING"), None)

    lot_updates = {"updated_at": datetime.utcnow()}
    if all_done:
        lot_updates["status"]    = "COMPLETED"
        lot_updates["closed_at"] = date.today().isoformat()
    elif any_started:
        lot_updates["status"] = "IN_PROGRESS"

    if current:
        lot_updates["current_sequence"]     = current["sequence"]
        lot_updates["current_process_code"] = current["process_code"]
        lot_updates["current_process_name"] = current["process_name"]

    await db.lots.update_one({"lot_no": lot_no}, {"$set": lot_updates})


# ── DELETE /api/lots/{lot_no} ─────────────────────────────
@router.delete("/{lot_no}", status_code=204)
async def delete_lot(request: Request, lot_no: str):
    db     = request.app.state.db
    result = await db.lots.delete_one({"lot_no": lot_no})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="LOT를 찾을 수 없습니다.")
    await db.lot_process_logs.delete_many({"lot_no": lot_no})
