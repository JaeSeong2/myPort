# 실시간 알림 + Andon(라인/설비 현황) 라우터 - SSE 스트리밍 - 2026-08-02
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from datetime import date
import asyncio
import json

router = APIRouter(prefix="/api/alerts", tags=["실시간 알림"])

# SSE 재계산 주기(초) — 데모용으로 짧게. 프로덕션이면 이벤트 기반으로 전환 권장 - 2026-08-02
STREAM_INTERVAL = 8

# Andon 타일 설비 상태 라벨(언어별) - 2026-08-02 / 영문 추가 - 2026-08-13
EQ_STATUS_LABEL = {
    "ko": {"RUNNING": "가동", "IDLE": "대기", "MAINTENANCE": "정비", "BREAKDOWN": "고장"},
    "en": {"RUNNING": "Running", "IDLE": "Idle", "MAINTENANCE": "Maint.", "BREAKDOWN": "Down"},
}

# 알림 문구(언어별 템플릿) — SSE로 내려가는 title/category/message 현지화 - 2026-08-13
STR = {
    "ko": {
        "cat_eq": "설비", "cat_inv": "재고", "cat_qa": "품질",
        "eq_break_title": "설비 고장",       "eq_break_msg": "[{code}] {name} 고장 — 즉시 조치 필요",
        "eq_maint_title": "설비 정비 중",     "eq_maint_msg": "[{code}] {name} 정비 진행 중",
        "inv_out_title":  "재고 품절",        "inv_out_msg":  "{name} 재고 소진 — 발주 필요",
        "inv_low_title":  "안전재고 미달",     "inv_low_msg":  "{name} 현재고 {cur} (안전 {safe})",
        "qa_fail_title":  "품질 불합격 발생",  "qa_fail_msg":  "오늘 불합격 검사 {n}건 — 원인 확인 필요",
    },
    "en": {
        "cat_eq": "Equipment", "cat_inv": "Inventory", "cat_qa": "Quality",
        "eq_break_title": "Equipment Breakdown",       "eq_break_msg": "[{code}] {name} broke down — immediate action required",
        "eq_maint_title": "Under Maintenance",         "eq_maint_msg": "[{code}] {name} under maintenance",
        "inv_out_title":  "Out of Stock",              "inv_out_msg":  "{name} out of stock — reorder required",
        "inv_low_title":  "Below Safety Stock",        "inv_low_msg":  "{name} stock {cur} (safety {safe})",
        "qa_fail_title":  "Quality Failure",           "qa_fail_msg":  "{n} failed inspections today — investigate cause",
    },
}


async def _compute(db, lang: str = "ko") -> dict:
    """설비/재고/품질 데이터를 훑어 실시간 알림 목록 + Andon 스냅샷 생성 - 2026-08-02
    lang(ko|en)에 따라 알림 문구/라벨 현지화 - 2026-08-13"""
    L = STR.get(lang, STR["ko"])
    EQL = EQ_STATUS_LABEL.get(lang, EQ_STATUS_LABEL["ko"])
    today = date.today().isoformat()

    # ── 설비: Andon 타일 + 고장 알림 ──────────────────────────
    eqs = await db.equipment.find(
        {"active": True},
        {"code": 1, "name": 1, "status": 1, "location": 1, "eq_type": 1, "_id": 0},
    ).sort("code", 1).to_list(None)

    summary = {"RUNNING": 0, "IDLE": 0, "MAINTENANCE": 0, "BREAKDOWN": 0}
    lines = []
    for e in eqs:
        st = e.get("status", "IDLE")
        summary[st] = summary.get(st, 0) + 1
        lines.append({
            "code":     e.get("code", ""),
            "name":     e.get("name", ""),
            "status":   st,
            "label":    EQL.get(st, st),
            "location": e.get("location", ""),
            "eq_type":  e.get("eq_type", ""),
        })

    alerts = []
    for e in eqs:
        if e.get("status") == "BREAKDOWN":
            alerts.append({
                "id":       f"eq-break-{e.get('code')}",
                "level":    "critical",
                "category": L["cat_eq"],
                "title":    L["eq_break_title"],
                "message":  L["eq_break_msg"].format(code=e.get("code"), name=e.get("name")),
            })
        elif e.get("status") == "MAINTENANCE":
            alerts.append({
                "id":       f"eq-maint-{e.get('code')}",
                "level":    "info",
                "category": L["cat_eq"],
                "title":    L["eq_maint_title"],
                "message":  L["eq_maint_msg"].format(code=e.get("code"), name=e.get("name")),
            })

    # ── 재고: 품절/안전재고 미달 알림 ────────────────────────
    stocks = await db.inventory.find(
        {},
        {"item_name": 1, "current_stock": 1, "safety_stock": 1, "_id": 0},
    ).to_list(None)

    for s in stocks:
        cur  = s.get("current_stock", 0)
        safe = s.get("safety_stock", 0)
        name = s.get("item_name", "")
        if cur <= 0:
            alerts.append({
                "id":       f"inv-out-{name}",
                "level":    "critical",
                "category": L["cat_inv"],
                "title":    L["inv_out_title"],
                "message":  L["inv_out_msg"].format(name=name),
            })
        elif safe > 0 and cur < safe:
            alerts.append({
                "id":       f"inv-low-{name}",
                "level":    "warning",
                "category": L["cat_inv"],
                "title":    L["inv_low_title"],
                "message":  L["inv_low_msg"].format(name=name, cur=cur, safe=safe),
            })

    # ── 품질: 오늘 불합격 검사 요약 알림 ─────────────────────
    qas = await db.inspections.find(
        {"inspect_date": today},
        {"quantity": 1, "passed": 1, "_id": 0},
    ).to_list(None)
    ng_count = sum(1 for q in qas if q.get("passed", 0) < q.get("quantity", 0))
    if ng_count > 0:
        alerts.append({
            "id":       f"qa-fail-{today}",
            "level":    "warning",
            "category": L["cat_qa"],
            "title":    L["qa_fail_title"],
            "message":  L["qa_fail_msg"].format(n=ng_count),
        })

    # 심각도 순 정렬(critical → warning → info) - 2026-08-02
    order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: order.get(a["level"], 9))

    return {
        "alerts": alerts,
        "andon":  {"summary": summary, "lines": lines, "total": len(lines)},
        "ts":     today,
    }


# ── GET /api/alerts ── 현재 알림/Andon 스냅샷(폴백/초기 로드용) ──────
def _lang_of(request: Request) -> str:
    return "en" if str(request.query_params.get("lang", "ko")).lower() == "en" else "ko"


@router.get("")
async def get_alerts(request: Request):
    """현재 활성 알림 + Andon 스냅샷 1회 반환 - 2026-08-02"""
    return await _compute(request.app.state.db, _lang_of(request))


# ── GET /api/alerts/stream ── SSE 실시간 스트림 ──────────────────────
@router.get("/stream")
async def stream_alerts(request: Request):
    """SSE로 알림/Andon 상태를 주기적으로 푸시 - 2026-08-02"""
    db = request.app.state.db
    lang = _lang_of(request)

    async def event_gen():
        try:
            while True:
                # 클라이언트 연결 종료 감지 시 스트림 정리
                if await request.is_disconnected():
                    break
                payload = await _compute(db, lang)
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                await asyncio.sleep(STREAM_INTERVAL)
        except asyncio.CancelledError:
            # 정상 종료(클라이언트 disconnect) — 조용히 마무리
            raise

    headers = {
        "Cache-Control":     "no-cache",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",  # nginx 등에서 SSE 버퍼링 방지
    }
    return StreamingResponse(event_gen(), media_type="text/event-stream", headers=headers)
