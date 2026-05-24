# BOM 관리 API 라우터 - 2026-05-23
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/bom", tags=["BOM"])


class BomCreate(BaseModel):
    product_code: str
    material_code: str
    quantity:      float = Field(..., gt=0)
    unit:          str = "EA"
    note:          str = ""


class BomUpdate(BaseModel):
    quantity: Optional[float] = None
    unit:     Optional[str]   = None
    note:     Optional[str]   = None


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def ensure_indexes(db):
    await db.boms.create_index([("product_code", 1), ("material_code", 1)], unique=True)
    await db.boms.create_index("product_code")


@router.get("")
async def list_bom(request: Request, product_code: Optional[str] = Query(None)):
    db    = request.app.state.db
    query = {"product_code": product_code} if product_code else {}
    cursor = db.boms.find(query).sort("material_code", 1)
    docs   = [_serialize(doc) async for doc in cursor]
    return {"data": docs, "total": len(docs)}


@router.post("", status_code=201)
async def create_bom(request: Request, body: BomCreate):
    db = request.app.state.db

    product  = await db.items.find_one({"code": body.product_code})
    material = await db.items.find_one({"code": body.material_code})
    if not product:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다.")
    if not material:
        raise HTTPException(status_code=404, detail="자재를 찾을 수 없습니다.")

    doc = {
        "product_code":   body.product_code,
        "product_name":   product["name"],
        "material_code":  body.material_code,
        "material_name":  material["name"],
        "quantity":       body.quantity,
        "unit":           body.unit or material.get("unit", "EA"),
        "note":           body.note,
        "created_at":     datetime.utcnow(),
    }
    try:
        result  = await db.boms.insert_one(doc)
        created = await db.boms.find_one({"_id": result.inserted_id})
        return _serialize(created)
    except Exception:
        raise HTTPException(status_code=409, detail="이미 등록된 BOM 항목입니다.")


@router.put("/{doc_id}")
async def update_bom(request: Request, doc_id: str, body: BomUpdate):
    db      = request.app.state.db
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경 항목이 없습니다.")
    await db.boms.update_one({"_id": ObjectId(doc_id)}, {"$set": updates})
    updated = await db.boms.find_one({"_id": ObjectId(doc_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="BOM 항목을 찾을 수 없습니다.")
    return _serialize(updated)


@router.delete("/{doc_id}", status_code=204)
async def delete_bom(request: Request, doc_id: str):
    db     = request.app.state.db
    result = await db.boms.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="BOM 항목을 찾을 수 없습니다.")
