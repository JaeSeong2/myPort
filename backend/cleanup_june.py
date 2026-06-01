"""6월 중복 데이터 정리 스크립트 - 2026-06-01
seed_june.py 3회 실행으로 생긴 중복 제거 후 May IN_PROG WO 복원
사용법: python cleanup_june.py
"""
import urllib.request, urllib.error, json, sys

BASE = "http://localhost:8000"


def req(method, path, body=None):
    """HTTP 요청 헬퍼 - 2026-06-01"""
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(
        f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method=method,
    )
    try:
        with urllib.request.urlopen(r) as res:
            return json.loads(res.read()) if res.status not in (204,) else {}
    except urllib.error.HTTPError as e:
        print(f"  NG {method} {path} -> {e.code} {e.read().decode()[:80]}")
    except Exception as e:
        print(f"  NG {method} {path} -> {e}")
    return None

get    = lambda p:    req("GET",    p)
delete = lambda p:    req("DELETE", p)
put    = lambda p, b: req("PUT",    p, b)


# ══════════════════════════════════════════════════════
# 1. 6월 작업지시 전체 삭제 (planned_start >= 2026-06-01)
# ══════════════════════════════════════════════════════
print("\n[1] 6월 작업지시 삭제")
wo_data = get("/api/work-orders?start_date=2026-06-01&end_date=2026-06-30")
june_wos = wo_data.get("data", []) if wo_data else []
for wo in june_wos:
    delete(f"/api/work-orders/{wo['_id']}")
print(f"  삭제: {len(june_wos)}건")


# ══════════════════════════════════════════════════════
# 2. 6월 생산실적 전체 삭제 (work_date >= 2026-06-01)
# ══════════════════════════════════════════════════════
print("\n[2] 6월 생산실적 삭제")
prod_data = get("/api/productions?start_date=2026-06-01&end_date=2026-06-30")
june_prods = prod_data.get("data", []) if prod_data else []
for p in june_prods:
    delete(f"/api/productions/{p['_id']}")
print(f"  삭제: {len(june_prods)}건")


# ══════════════════════════════════════════════════════
# 3. 6월 품질검사 전체 삭제 (inspect_date >= 2026-06-01)
# ══════════════════════════════════════════════════════
print("\n[3] 6월 품질검사 삭제")
qa_data = get("/api/quality?start_date=2026-06-01&end_date=2026-06-30")
june_qa = qa_data.get("data", []) if qa_data else []
for q in june_qa:
    delete(f"/api/quality/{q['_id']}")
print(f"  삭제: {len(june_qa)}건")


# ══════════════════════════════════════════════════════
# 4. 6월 재고 거래 삭제 + 재고 역산 보정
# ══════════════════════════════════════════════════════
print("\n[4] 6월 재고 거래 삭제 및 재고 역산")
txn_data = get("/api/inventory/txns?start_date=2026-06-01&end_date=2026-06-30")
june_txns = txn_data.get("data", []) if txn_data else []

# 거래별 재고 역산 (삭제할 거래의 영향을 되돌림)
adj: dict = {}
for t in june_txns:
    code = t["item_code"]
    qty  = t["quantity"]
    if t["txn_type"] == "IN":
        adj[code] = adj.get(code, 0) - qty   # 입고 취소 -> 감소
    elif t["txn_type"] == "OUT":
        adj[code] = adj.get(code, 0) + qty   # 출고 취소 -> 증가

# 재고 수정 (ADJUST 거래로 역산)
import urllib.parse
for code, delta in adj.items():
    if delta == 0:
        continue
    inv_res = get(f"/api/inventory?item_code={urllib.parse.quote(code)}")
    items = inv_res.get("data", []) if inv_res else []
    item = next((i for i in items if i["item_code"] == code), None)
    if not item:
        continue
    new_stock = max(0, item["current_stock"] + delta)
    # inventory 직접 수정 엔드포인트가 없으므로 ADJUST txn으로 처리
    diff = new_stock - item["current_stock"]
    if diff == 0:
        continue
    txn_type = "IN" if diff > 0 else "OUT"
    req("POST", "/api/inventory/txns", {
        "txn_type":  txn_type,
        "item_code": code,
        "item_name": item.get("item_name", code),
        "quantity":  abs(diff),
        "unit":      item.get("unit", "EA"),
        "txn_date":  "2026-06-01",
        "note":      "6월 중복 시딩 정리 조정",
    })
    print(f"  재고 조정: {code} {'+' if diff > 0 else ''}{diff:.1f} {item.get('unit','EA')} -> {new_stock:.1f}")

# 거래 삭제
for t in june_txns:
    delete(f"/api/inventory/txns/{t['_id']}")
print(f"  거래 삭제: {len(june_txns)}건")


# ══════════════════════════════════════════════════════
# 5. 5월 작업지시 IN_PROG 복원
#    seed_june.py가 DONE 처리한 May WO들을 다시 IN_PROG로
# ══════════════════════════════════════════════════════
print("\n[5] 5월 IN_PROG 작업지시 복원")
# planned_start가 5월이고 status=DONE인 WO 중 actual_end >= 2026-06-01 인 것
may_done = get("/api/work-orders?status=DONE&start_date=2026-05-01&end_date=2026-05-31")
may_done_wos = may_done.get("data", []) if may_done else []

# 6월에 완료된 것들 (actual_end >= 2026-06-01) = seed_june이 처리한 것
restored = 0
for wo in may_done_wos:
    ae = wo.get("actual_end") or ""
    if ae >= "2026-06-01":
        put(f"/api/work-orders/{wo['_id']}", {
            "status": "IN_PROG",
            "actual_end": None,
        })
        print(f"  IN_PROG 복원: {wo['order_id']} {wo['product_name'][:20]}")
        restored += 1

# actual_end가 null인 May DONE WOs는 원래부터 DONE이므로 skip
print(f"  복원: {restored}건")

print("\n정리 완료! seed_june.py 를 다시 실행하세요.")
