# AI 인사이트 라우터 - 2026-06-04
from fastapi import APIRouter, Request, HTTPException
from groq import AsyncGroq
from collections import defaultdict
from datetime import date, datetime, timedelta
import os

router = APIRouter(prefix="/api/ai", tags=["AI 인사이트"])

# 환경변수로 토큰 용량 및 호출 횟수 제어
AI_DAILY_LIMIT = int(os.getenv("AI_DAILY_LIMIT", "10"))
AI_MAX_TOKENS  = int(os.getenv("AI_MAX_TOKENS", "600"))

# IP당 날짜별 호출 횟수 추적
_ai_call_log: dict = defaultdict(lambda: defaultdict(int))


def _month_range() -> tuple[str, str]:
    """현재 월의 시작·종료 날짜 반환"""
    now = datetime.utcnow()
    first = datetime(now.year, now.month, 1)
    last  = (first + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    return first.strftime("%Y-%m-%d"), last.strftime("%Y-%m-%d")


async def _build_summary(db) -> dict:
    """현재 월 KPI 집계 - 필요한 필드만 추출해 입력 토큰 최소화"""
    start, end = _month_range()

    wos = await db.work_orders.find(
        {"plan_date": {"$gte": start, "$lte": end}},
        {"status": 1, "_id": 0}
    ).to_list(None)

    prods = await db.productions.find(
        {"work_date": {"$gte": start, "$lte": end}},
        {"actual_qty": 1, "defect_qty": 1, "_id": 0}
    ).to_list(None)

    qas = await db.inspections.find(
        {"inspect_date": {"$gte": start, "$lte": end}},
        {"quantity": 1, "passed": 1, "_id": 0}
    ).to_list(None)

    stocks = await db.inventory.find(
        {},
        {"item_name": 1, "current_stock": 1, "safety_stock": 1, "_id": 0}
    ).to_list(None)

    eqs = await db.equipment.find(
        {},
        {"status": 1, "_id": 0}
    ).to_list(None)

    wo_status: dict = {}
    for w in wos:
        s = w.get("status", "UNKNOWN")
        wo_status[s] = wo_status.get(s, 0) + 1

    total_actual = sum(p.get("actual_qty", 0) for p in prods)
    total_defect = sum(p.get("defect_qty", 0) for p in prods)
    defect_rate  = round(total_defect / total_actual * 100, 1) if total_actual > 0 else 0

    total_qty    = sum(q.get("quantity", 0) for q in qas)
    total_passed = sum(q.get("passed", 0) for q in qas)
    pass_rate    = round(total_passed / total_qty * 100, 1) if total_qty > 0 else 0

    low_stock = [
        s["item_name"] for s in stocks
        if s.get("current_stock", 0) <= 0
        or (s.get("safety_stock", 0) > 0 and s.get("current_stock", 0) < s.get("safety_stock", 0))
    ]

    eq_status: dict = {}
    for e in eqs:
        s = e.get("status", "UNKNOWN")
        eq_status[s] = eq_status.get(s, 0) + 1

    return {
        "period":      f"{start} ~ {end}",
        "work_orders": wo_status,
        "production": {
            "records":     len(prods),
            "actual_qty":  round(total_actual),
            "defect_qty":  round(total_defect),
            "defect_rate": f"{defect_rate}%",
        },
        "quality": {
            "inspections": len(qas),
            "pass_rate":   f"{pass_rate}%",
        },
        "inventory": {
            "low_stock_count": len(low_stock),
            "low_stock_items": low_stock[:5],
        },
        "equipment": eq_status,
    }


@router.post("/insight")
async def ai_insight(request: Request):
    """월간 KPI 기반 AI 생산 인사이트 생성 - IP당 일일 AI_DAILY_LIMIT회 제한 - 2026-06-04"""
    ip    = request.client.host if request.client else "unknown"
    today = date.today().isoformat()

    if _ai_call_log[ip][today] >= AI_DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"AI 인사이트는 하루 {AI_DAILY_LIMIT}회까지 요청할 수 있습니다."
        )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Groq API 키가 설정되지 않았습니다.")

    db      = request.app.state.db
    summary = await _build_summary(db)

    # 한국어 전용 강제 — 한자/베트남어 등 타 언어 토큰 혼입(language leakage) 방지 - 2026-08-02
    system_msg = (
        "당신은 한국 제조 현장의 MES 데이터 분석가입니다. "
        "반드시 100% 표준 한국어(한글)로만 작성하세요. "
        "한자, 일본어, 중국어, 베트남어 등 한글이 아닌 문자를 절대 사용하지 마세요. "
        "예: '良好' → '양호', 'thấp' → '낮음'. "
        "숫자와 %, 영문 약어(MES, KPI 등) 외에는 오직 한글만 사용합니다."
    )

    prompt = (
        "다음은 MES(제조실행시스템)의 이번 달 KPI 요약 데이터입니다.\n"
        f"{summary}\n\n"
        "위 데이터를 분석하여 반드시 아래 JSON 형식으로만, 순수 한국어로 응답하세요. 다른 말은 쓰지 마세요:\n"
        '{"성과": "핵심 성과 1~2문장", "주의": "주의가 필요한 항목 1~2문장", "제안": "개선 제안 1~2문장"}'
    )

    client   = AsyncGroq(api_key=api_key)
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=AI_MAX_TOKENS,
        temperature=0.3,
    )

    _ai_call_log[ip][today] += 1

    usage = response.usage
    return {
        "insight": response.choices[0].message.content,
        "token_usage": {
            "prompt_tokens":     usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens":      usage.total_tokens,
        },
        "remaining_calls": AI_DAILY_LIMIT - _ai_call_log[ip][today],
    }
