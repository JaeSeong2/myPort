# 설비 관리 API 라우터 - 2026-05-24
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/equipment", tags=["설비"])

EQ_TYPES   = {"PRODUCTION", "UTILITY", "SAFETY", "INSPECTION"}
EQ_STATUSES = {"RUNNING", "IDLE", "MAINTENANCE", "BREAKDOWN"}


class EquipmentCreate(BaseModel):
    code:          str
    name:          str
    eq_type:       str = Field(..., pattern="^(PRODUCTION|UTILITY|SAFETY|INSPECTION)$")
    status:        str = Field("IDLE", pattern="^(RUNNING|IDLE|MAINTENANCE|BREAKDOWN)$")
    location:      Optional[str] = ""
    manufacturer:  Optional[str] = ""
    install_date:  Optional[str] = ""
    last_pm_date:  Optional[str] = ""
    active:        bool = True
    note:          Optional[str] = ""


class EquipmentUpdate(BaseModel):
    name:          Optional[str] = None
    eq_type:       Optional[str] = Field(None, pattern="^(PRODUCTION|UTILITY|SAFETY|INSPECTION)$")
    status:        Optional[str] = Field(None, pattern="^(RUNNING|IDLE|MAINTENANCE|BREAKDOWN)$")
    location:      Optional[str] = None
    manufacturer:  Optional[str] = None
    install_date:  Optional[str] = None
    last_pm_date:  Optional[str] = None
    active:        Optional[bool] = None
    note:          Optional[str] = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def ensure_indexes(db):
    await db.equipment.create_index("code", unique=True)
    await db.equipment.create_index("eq_type")
    await db.equipment.create_index("status")
    await db.equipment.create_index("active")


# ── GET /api/equipment ────────────────────────────────────
@router.get("")
async def list_equipment(
    request:     Request,
    eq_type:     Optional[str] = Query(None),
    status:      Optional[str] = Query(None),
    active_only: bool          = Query(False),
):
    db = request.app.state.db
    query = {}
    if eq_type and eq_type != "ALL":  query["eq_type"] = eq_type
    if status  and status  != "ALL":  query["status"]  = status
    if active_only:                    query["active"]  = True
    cursor = db.equipment.find(query).sort("code", 1)
    docs = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


# ── POST /api/equipment ───────────────────────────────────
@router.post("", status_code=201)
async def create_equipment(request: Request, body: EquipmentCreate):
    db = request.app.state.db
    if await db.equipment.find_one({"code": body.code}):
        raise HTTPException(status_code=409, detail="동일한 설비코드가 이미 존재합니다.")
    doc = {
        **body.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result  = await db.equipment.insert_one(doc)
    created = await db.equipment.find_one({"_id": result.inserted_id})
    return _serialize(created)


# ── PUT /api/equipment/{id} ───────────────────────────────
@router.put("/{doc_id}")
async def update_equipment(request: Request, doc_id: str, body: EquipmentUpdate):
    db = request.app.state.db
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")
    updates["updated_at"] = datetime.utcnow()
    result = await db.equipment.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="설비를 찾을 수 없습니다.")
    updated = await db.equipment.find_one({"_id": ObjectId(doc_id)})
    return _serialize(updated)


# ── DELETE /api/equipment/{id} ────────────────────────────
@router.delete("/{doc_id}", status_code=204)
async def delete_equipment(request: Request, doc_id: str):
    db = request.app.state.db
    result = await db.equipment.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="설비를 찾을 수 없습니다.")
