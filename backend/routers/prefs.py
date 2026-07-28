# 사용자별 UI 환경설정(북마크·위젯 배치·분할 사이즈) 저장 API 라우터 - 2026-07-28
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/prefs", tags=["환경설정"])

# 저장 가능한 최상위 슬라이스 키 화이트리스트 (임의 키 저장 방지) - 2026-07-28
ALLOWED_KEYS = {"mes_panels", "mes_dash_rgl", "mes_dash_worker_rgl"}

# 문서 전체 크기 제한(과도한 저장 방지) — 대략 256KB - 2026-07-28
MAX_BYTES = 256 * 1024


def _norm(uid: str) -> str:
    return (uid or "guest").strip().lower()


async def ensure_indexes(db):
    # user_id 당 1개 문서(upsert) - 2026-07-28
    await db.user_prefs.create_index("user_id", unique=True)


@router.get("/{user_id}")
async def get_prefs(request: Request, user_id: str):
    """
    사용자별 저장된 UI 환경설정 반환. 없으면 빈 객체.
    @date 2026-07-28
    """
    db = request.app.state.db
    doc = await db.user_prefs.find_one({"user_id": _norm(user_id)})
    if not doc:
        return {"data": {}}
    doc.pop("_id", None)
    doc.pop("user_id", None)
    doc.pop("updated_at", None)
    return {"data": doc}


@router.put("/{user_id}")
async def put_prefs(request: Request, user_id: str, body: dict):
    """
    사용자별 UI 환경설정 부분 병합 저장(upsert). 허용된 슬라이스 키만 반영.
    @date 2026-07-28
    """
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="본문은 객체여야 합니다.")

    updates = {k: v for k, v in body.items() if k in ALLOWED_KEYS}
    if not updates:
        raise HTTPException(status_code=400, detail="저장 가능한 항목이 없습니다.")

    # 크기 방어 — 직렬화 길이로 대략 검사
    import json
    if len(json.dumps(updates, ensure_ascii=False).encode("utf-8")) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="저장 용량이 너무 큽니다.")

    db = request.app.state.db
    updates["updated_at"] = datetime.utcnow()
    await db.user_prefs.update_one(
        {"user_id": _norm(user_id)},
        {"$set": updates, "$setOnInsert": {"user_id": _norm(user_id)}},
        upsert=True,
    )
    return {"ok": True}
