# LOT 추적 테스트 데이터 시딩 - 2026-05-25
import urllib.request, urllib.error, json

BASE = "http://localhost:8000"

def req(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body else None
    r = urllib.request.Request(f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"} if data else {}, method=method)
    try:
        with urllib.request.urlopen(r) as res:
            return json.loads(res.read()) if res.status not in (204,) else {}
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        print(f"  NG {method} {path} -> {e.code} {msg[:80]}")
        return None
    except Exception as e:
        print(f"  NG {method} {path} -> {e}")
        return None

def post(path, body): return req("POST", path, body)
def put(path, body):  return req("PUT",  path, body)
def get(path):        return req("GET",  path)

# ── 0. 기존 LOT 삭제 ─────────────────────────────────────
print("\n[기존 LOT 삭제]")
lots = get("/api/lots")
if lots:
    for lot in lots.get("data", []):
        req("DELETE", f"/api/lots/{lot['lot_no']}")
    print(f"  OK {len(lots.get('data', []))}건 삭제")

# ── 1. 작업지시 조회 (착수 대상 확인) ─────────────────────
print("\n[작업지시 조회]")
wo_data = get("/api/work-orders")
wo_list = wo_data.get("data", []) if wo_data else []
print(f"  작업지시 {len(wo_list)}건 확인")

# product_code 기준으로 WO 매핑
wo_by_product = {}
for wo in wo_list:
    pcode = wo.get("product_code")
    if pcode and pcode not in wo_by_product:
        wo_by_product[pcode] = wo

# ── 2. LOT 생성 ───────────────────────────────────────────
print("\n[LOT 생성]")

# (product_code, product_name, planned_qty, note)
lot_configs = [
    ("P-001", "드라이브 샤프트 DS-200",   100, "1차 양산 LOT"),
    ("P-001", "드라이브 샤프트 DS-200",   100, "2차 양산 LOT"),
    ("P-002", "브레이크 디스크 BD-280",   200, "긴급 발주 대응"),
    ("P-003", "자동변속기 기어셋 AT-5",    50, ""),
    ("P-004", "스티어링 너클 SK-L",       150, ""),
    ("P-005", "서스펜션 로어암 SLA-F",    120, ""),
    ("S-001", "CV조인트 반조립품",         80, "수출향"),
    ("S-002", "브레이크 캘리퍼 반조립품",  60, ""),
]

created_lots = []
for pcode, pname, qty, note in lot_configs:
    wo = wo_by_product.get(pcode)
    order_id = wo["order_id"] if wo else f"WO-MANUAL-{pcode}"
    body = {
        "order_id":     order_id,
        "product_code": pcode,
        "product_name": pname,
        "planned_qty":  qty,
        "note":         note,
    }
    r = post("/api/lots", body)
    if r:
        created_lots.append(r)
        print(f"  OK {r['lot_no']} | {pname} | {qty}개")

# ── 3. 공정 로그 업데이트 (진행 시나리오 반영) ────────────
print("\n[공정 로그 업데이트]")

employees = ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005"]

def update_logs(lot_no, scenario):
    """scenario: list of (sequence, status, actual_qty, defect_qty, worker_idx)"""
    detail = get(f"/api/lots/{lot_no}/detail")
    if not detail:
        return
    logs = sorted(detail.get("process_logs", []), key=lambda l: l["sequence"])
    for seq, status, actual_qty, defect_qty, widx in scenario:
        log = next((l for l in logs if l["sequence"] == seq), None)
        if not log:
            continue
        body = {"status": status, "worker_code": employees[widx % len(employees)]}
        if actual_qty is not None:
            body["actual_qty"] = actual_qty
            body["defect_qty"] = defect_qty
        put(f"/api/lots/{lot_no}/logs/{log['_id']}", body)
    print(f"  OK {lot_no} 공정 업데이트")

if len(created_lots) >= 1:
    # LOT 0 (P-001 1차): 전 공정 완료
    ln = created_lots[0]["lot_no"]
    update_logs(ln, [
        (1, "COMPLETED", 100, 2, 0),
        (2, "COMPLETED", 98,  0, 1),
        (3, "COMPLETED", 98,  1, 2),
        (4, "COMPLETED", 97,  0, 3),
    ])
    put(f"/api/lots/{ln}", {"status": "COMPLETED"})

if len(created_lots) >= 2:
    # LOT 1 (P-001 2차): 3번 공정 진행 중
    ln = created_lots[1]["lot_no"]
    update_logs(ln, [
        (1, "COMPLETED",   100, 1, 0),
        (2, "COMPLETED",   99,  0, 1),
        (3, "IN_PROGRESS", None, None, 2),
    ])

if len(created_lots) >= 3:
    # LOT 2 (P-002): 2번 공정 진행 중
    ln = created_lots[2]["lot_no"]
    update_logs(ln, [
        (1, "COMPLETED",   200, 3, 3),
        (2, "IN_PROGRESS", None, None, 0),
    ])

if len(created_lots) >= 4:
    # LOT 3 (P-003): 1번 공정 완료, 2번 대기
    ln = created_lots[3]["lot_no"]
    update_logs(ln, [
        (1, "COMPLETED", 50, 0, 4),
    ])

if len(created_lots) >= 5:
    # LOT 4 (P-004): 방금 착수 (전 공정 대기)
    pass  # CREATED 상태 유지

if len(created_lots) >= 6:
    # LOT 5 (P-005): ON_HOLD
    ln = created_lots[5]["lot_no"]
    update_logs(ln, [
        (1, "COMPLETED",   120, 2, 1),
        (2, "IN_PROGRESS", None, None, 2),
    ])
    put(f"/api/lots/{ln}", {"status": "ON_HOLD", "note": "원자재 부족으로 보류"})

if len(created_lots) >= 7:
    # LOT 6 (S-001): 3번 공정까지 완료
    ln = created_lots[6]["lot_no"]
    update_logs(ln, [
        (1, "COMPLETED", 80, 1, 0),
        (2, "COMPLETED", 79, 0, 1),
        (3, "COMPLETED", 79, 2, 3),
    ])

if len(created_lots) >= 8:
    # LOT 7 (S-002): 전 공정 완료
    ln = created_lots[7]["lot_no"]
    update_logs(ln, [
        (1, "COMPLETED", 60, 1, 4),
        (2, "COMPLETED", 59, 0, 2),
        (3, "COMPLETED", 59, 0, 3),
    ])
    put(f"/api/lots/{ln}", {"status": "COMPLETED"})

print("\n완료!")
