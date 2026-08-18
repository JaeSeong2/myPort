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
# 사용 모델 — 폐기 시 코드 수정 없이 Railway 환경변수(GROQ_MODEL)만 교체하면 됨 - 2026-08-18
# (llama-3.3-70b-versatile은 2026-08-16 폐기 → 현행 프로덕션 모델로 기본값 변경)
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

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


# 언어별 시스템/프롬프트 — JSON 키는 언어 중립(highlight/caution/suggestion)으로 통일 - 2026-08-13
# 프런트는 언어와 무관하게 이 키로 파싱하고, 라벨은 로케일(t)로 표시한다.
def _messages_for(summary: dict, lang: str):
    if lang == "en":
        system_msg = (
            "You are an MES (Manufacturing Execution System) data analyst. "
            "Respond ONLY in clear, professional English. "
            "Use only English letters, numbers, %, and common abbreviations (MES, KPI)."
        )
        prompt = (
            "Below is this month's MES KPI summary data.\n"
            f"{summary}\n\n"
            "Analyze it and respond ONLY in the following JSON format, in English. "
            "Do not add any other text:\n"
            '{"highlight": "1-2 sentences on key performance", '
            '"caution": "1-2 sentences on items needing attention", '
            '"suggestion": "1-2 sentences on improvement suggestions"}'
        )
        return system_msg, prompt

    # 기본: 한국어 전용 강제 — 한자/베트남어 등 타 언어 토큰 혼입(language leakage) 방지 - 2026-08-02
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
        "위 데이터를 분석하여 반드시 아래 JSON 형식으로만, 순수 한국어로 응답하세요. "
        "다른 말은 쓰지 마세요. (JSON 키는 영문 그대로 두고 값만 한국어로 작성):\n"
        '{"highlight": "핵심 성과 1~2문장", "caution": "주의가 필요한 항목 1~2문장", "suggestion": "개선 제안 1~2문장"}'
    )
    return system_msg, prompt


@router.post("/insight")
async def ai_insight(request: Request):
    """월간 KPI 기반 AI 생산 인사이트 생성 - IP당 일일 AI_DAILY_LIMIT회 제한 - 2026-06-04
    요청 본문의 lang(ko|en)에 따라 응답 언어 결정 - 2026-08-13"""
    ip    = request.client.host if request.client else "unknown"
    today = date.today().isoformat()

    # 요청 언어 파싱 (본문 없으면 ko)
    try:
        body = await request.json()
    except Exception:
        body = {}
    lang = "en" if str(body.get("lang", "ko")).lower() == "en" else "ko"

    if _ai_call_log[ip][today] >= AI_DAILY_LIMIT:
        msg = (f"AI insight is limited to {AI_DAILY_LIMIT} requests per day."
               if lang == "en" else
               f"AI 인사이트는 하루 {AI_DAILY_LIMIT}회까지 요청할 수 있습니다.")
        raise HTTPException(status_code=429, detail=msg)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        msg = ("Groq API key is not configured." if lang == "en"
               else "Groq API 키가 설정되지 않았습니다.")
        raise HTTPException(status_code=503, detail=msg)

    db      = request.app.state.db
    summary = await _build_summary(db)
    system_msg, prompt = _messages_for(summary, lang)

    client = AsyncGroq(api_key=api_key)
    try:
        response = await client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=AI_MAX_TOKENS,
            temperature=0.3,
        )
    except Exception as e:
        # Groq 호출 실패(키 만료 401·모델 폐기 400·네트워크 등)를 500이 아닌 명시적 오류로 반환 - 2026-08-18
        # 미처리 500은 CORS 헤더가 빠져 브라우저에서 'CORS 에러'로 오인되므로 반드시 여기서 처리한다.
        status = getattr(e, "status_code", None) or 502
        reason = getattr(e, "message", None) or str(e)
        msg = (f"AI generation failed ({status}): {reason}" if lang == "en"
               else f"AI 생성 실패 ({status}): {reason}")
        raise HTTPException(status_code=502, detail=msg)

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
