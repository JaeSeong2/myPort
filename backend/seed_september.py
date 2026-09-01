"""9월(현재월) 전용 시드 — 8월 데이터 보존, 이번 달만 생성 - 2026-09-01
seed_relative.py의 '이번 달' 로직만 사용(지난달 미생성 → 기존 8월과 중복 방지).
완료 실적 + 진행중 2 + 대기 2(작업배정 보드용) + 재고 입출고. 서버 localhost:8000 필요.
사용법: python seed_september.py
"""
import urllib.request, urllib.error, json, sys
from datetime import date, timedelta

BASE = "http://localhost:8000"


def req(method, path, body=None):
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(
        f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"} if data else {}, method=method,
    )
    try:
        with urllib.request.urlopen(r) as res:
            return json.loads(res.read()) if res.status not in (204,) else {}
    except urllib.error.HTTPError as e:
        print(f"  NG {method} {path} -> {e.code} {e.read().decode()[:100]}")
    except Exception as e:
        print(f"  NG {method} {path} -> {e}")
    return None


def post(p, b): return req("POST", p, b)
def put(p, b):  return req("PUT", p, b)


# ── 날짜 계산 (오늘=이번 달) ────────────────────────────────
TODAY = date.today()
cy, cm = TODAY.year, TODAY.month


def month_bounds(y, m):
    first = date(y, m, 1)
    nxt = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    return first, nxt - timedelta(days=1)


cur_first, cur_last = month_bounds(cy, cm)


def recent_days(n):
    """오늘부터 과거로 n일 중 '이번 달' 안쪽 (오래된→최신)"""
    out = [TODAY - timedelta(days=i) for i in range(n)]
    out = [d for d in out if d >= cur_first]
    return list(reversed(out))


PRODUCTS = [
    ("P-001", "드라이브 샤프트 DS-200", "EA",  "MACHINE",  "EMP-001"),
    ("P-002", "브레이크 디스크 BD-280", "EA",  "GRIND",    "EMP-002"),
    ("P-003", "자동변속기 기어셋 AT-5",  "SET", "MACHINE",  "EMP-005"),
    ("P-004", "스티어링 너클 SK-L",      "EA",  "FORGE",    "EMP-003"),
    ("P-005", "서스펜션 로어암 SLA-F",   "EA",  "FORGE",    "EMP-006"),
    ("S-001", "CV조인트 반조립품",        "EA",  "ASSEMBLE", "EMP-004"),
    ("S-002", "브레이크 캘리퍼 반조립품", "EA",  "ASSEMBLE", "EMP-007"),
]


def make_wo(pc, pn, qty, unit, ps, pe, asgn, proc, status, as_, ae):
    r = post("/api/work-orders", {
        "type": "NORMAL", "priority": "MEDIUM", "product_code": pc, "product_name": pn,
        "quantity": qty, "unit": unit, "planned_start": ps, "planned_end": pe,
        "assignee": asgn, "process_code": proc, "note": "",
    })
    if r and status != "PENDING":
        upd = {"status": status, "actual_start": as_}
        if ae:
            upd["actual_end"] = ae
        put(f"/api/work-orders/{r['_id']}", upd)
    return r


def make_prod(wo, pc, pn, plan, actual, defect, proc, worker, wdate, complete):
    if not wo:
        return
    r = post("/api/productions", {
        "order_id": wo["order_id"], "product_code": pc, "product_name": pn,
        "planned_qty": plan, "actual_qty": actual, "defect_qty": defect,
        "process_code": proc, "worker_code": worker, "work_date": wdate,
        "start_time": "08:00", "end_time": "17:30" if complete else "",
        "note": "" if complete else "진행중",
    })
    if r and complete:
        put(f"/api/productions/{r['_id']}", {"status": "COMPLETED"})
    return r


def make_qa(pc, pn, itype, qty, passed, failed, insp, idate):
    post("/api/quality", {
        "product_code": pc, "product_name": pn, "inspect_type": itype,
        "quantity": qty, "passed": passed, "failed": failed,
        "inspector": insp, "inspect_date": idate,
    })


def make_txn(tt, code, name, qty, unit, d, note):
    post("/api/inventory/txns", {
        "txn_type": tt, "item_code": code, "item_name": name,
        "quantity": qty, "unit": unit, "txn_date": d, "note": note,
    })


# ── 이번 달(9월) 생성 ──────────────────────────────────────
print(f"[이번달 {cy}-{cm:02d}] 완료(최근 날짜 분산) + 진행중 + 대기")
rdays = recent_days(8) or [cur_first]

# 완료 실적 — 최근 날짜에 하루씩 분산 → 일별 차트에 막대 표시
for i, (pc, pn, unit, proc, worker) in enumerate(PRODUCTS[:min(5, len(rdays))]):
    wd = rdays[-(i + 1)].isoformat()
    ps = cur_first.isoformat()
    plan, actual, defect = 120 + i * 15, 120 + i * 15 - (3 + i), 2 + i % 3
    wo = make_wo(pc, pn, plan, unit, ps, TODAY.isoformat(), worker, proc, "DONE", ps, wd)
    make_prod(wo, pc, pn, plan, actual, defect, proc, worker, wd, True)
    make_qa(pc, pn, "IN_PROCESS", actual, actual - defect, defect, "EMP-003", wd)
    print(f"  OK {pc} 9월 완료 (실적 {wd})")

# 진행중 2건 (오늘 기준)
for j, (pc, pn, unit, proc, worker) in enumerate(PRODUCTS[5:7]):
    wd = rdays[-1].isoformat()
    ps = cur_first.isoformat()
    plan = 130 + j * 10
    wo = make_wo(pc, pn, plan, unit, ps, cur_last.isoformat(), worker, proc, "IN_PROG", ps, None)
    make_prod(wo, pc, pn, plan, plan // 2, 1, proc, worker, wd, False)
    print(f"  OK {pc} 9월 진행중 ({wd})")

# 대기 4건 (이번 달 예정) — 작업배정 보드용
for k, (pc, pn, unit, proc, worker) in enumerate(PRODUCTS[:4]):
    ps = min(cur_last, TODAY + timedelta(days=2 + k)).isoformat()
    pe = cur_last.isoformat()
    make_wo(pc, pn, 110 + k * 10, unit, ps, pe, worker, proc, "PENDING", None, None)
    print(f"  OK {pc} 9월 대기(배정 대상)")

# 이번 달 재고 입출고 (최근 날짜)
make_txn("IN",  "M-001", "고장력강판 SPFH590 1.4T", 2600, "KG", cur_first.isoformat(), f"{cm}월 월초 구매")
make_txn("IN",  "M-003", "탄소강환봉 S45C Φ80",     2100, "KG", cur_first.isoformat(), f"{cm}월 월초 구매")
make_txn("OUT", "M-003", "탄소강환봉 S45C Φ80",     560,  "KG", rdays[-1].isoformat(), f"{cm}월 투입")

print(f"\n9월 시드 완료! (8월 데이터는 그대로 보존)")
