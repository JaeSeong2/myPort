# 테스트 데이터 시딩 스크립트 - 2026-05-23
import urllib.request, json, time

BASE = "http://localhost:8000"

def post(path, body):
    data = json.dumps(body).encode("utf-8")
    req  = urllib.request.Request(f"{BASE}{path}", data=data,
                                   headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read())
            print(f"  OK {path} → {res.get('order_id') or res.get('prod_id') or res.get('txn_id') or res.get('code') or res.get('_id','?')}")
            return res
    except Exception as e:
        print(f"  NG {path} → {e}")
        return None

# ── 1. 품목 추가 ────────────────────────────────────────────
print("\n[품목]")
items = [
    {"code":"M-002","name":"스테인리스 파이프 50A","item_type":"RAW",    "unit":"M",  "spec":"SUS304 Ø50",  "unit_price":8500,  "safety_stock":200,"min_stock":100,"max_stock":2000,"active":True},
    {"code":"M-003","name":"알루미늄 블록 100x100","item_type":"RAW",    "unit":"EA", "spec":"AL6061 T6",   "unit_price":12000, "safety_stock":50, "min_stock":20, "max_stock":500, "active":True},
    {"code":"M-004","name":"볼트 M10x30",           "item_type":"CONSUMABLE","unit":"EA","spec":"SS400",    "unit_price":120,   "safety_stock":1000,"min_stock":500,"max_stock":10000,"active":True},
    {"code":"P-003","name":"펌프 하우징 C형",        "item_type":"FINISHED", "unit":"EA", "spec":"모델C-2026","unit_price":85000, "safety_stock":15, "min_stock":5,  "max_stock":100, "active":True},
    {"code":"S-001","name":"기어 반조립품 A",        "item_type":"SEMI",     "unit":"EA", "spec":"조립공정1완료","unit_price":35000,"safety_stock":20,"min_stock":10, "max_stock":200, "active":True},
]
for item in items:
    post("/api/items", item)

# ── 2. 작업지시 추가 ─────────────────────────────────────────
print("\n[작업지시]")
orders = [
    # IN_PROG
    {"type":"NORMAL","priority":"HIGH",  "product_code":"P-002","product_name":"샤프트 B형",       "quantity":30, "unit":"EA","planned_start":"2026-05-20","planned_end":"2026-05-25","assignee":"이영희","process_code":"PROC-02","note":"납기 임박"},
    {"type":"URGENT","priority":"HIGH",  "product_code":"P-003","product_name":"펌프 하우징 C형",  "quantity":15, "unit":"EA","planned_start":"2026-05-21","planned_end":"2026-05-28","assignee":"박민수","process_code":"PROC-01","note":"긴급 수주"},
    # PENDING
    {"type":"NORMAL","priority":"MEDIUM","product_code":"M-002","product_name":"스테인리스 파이프 50A","quantity":500,"unit":"M","planned_start":"2026-05-26","planned_end":"2026-05-31","assignee":"김철수","process_code":"PROC-03","note":""},
    {"type":"NORMAL","priority":"LOW",   "product_code":"S-001","product_name":"기어 반조립품 A",  "quantity":40, "unit":"EA","planned_start":"2026-05-27","planned_end":"2026-06-03","assignee":"이영희","process_code":"PROC-01","note":""},
    {"type":"REWORK", "priority":"MEDIUM","product_code":"P-001","product_name":"기어박스 A형",    "quantity":5,  "unit":"EA","planned_start":"2026-05-23","planned_end":"2026-05-24","assignee":"박민수","process_code":"PROC-02","note":"불량 재작업"},
    # STOPPED
    {"type":"NORMAL","priority":"LOW",   "product_code":"M-003","product_name":"알루미늄 블록 100x100","quantity":80,"unit":"EA","planned_start":"2026-05-19","planned_end":"2026-05-22","assignee":"최지훈","process_code":"PROC-03","note":"자재 부족으로 중단"},
    # DONE (추가)
    {"type":"NORMAL","priority":"MEDIUM","product_code":"S-001","product_name":"기어 반조립품 A",  "quantity":20, "unit":"EA","planned_start":"2026-05-15","planned_end":"2026-05-18","assignee":"김철수","process_code":"PROC-01","note":"완료"},
    {"type":"URGENT","priority":"HIGH",  "product_code":"P-002","product_name":"샤프트 B형",       "quantity":10, "unit":"EA","planned_start":"2026-05-12","planned_end":"2026-05-14","assignee":"이영희","process_code":"PROC-02","note":"완료"},
]
created_orders = []
for o in orders:
    r = post("/api/work-orders", o)
    if r: created_orders.append(r)

time.sleep(0.5)

# 상태 변경 (IN_PROG, STOPPED, DONE)
import urllib.request as ur
def put(path, body):
    data = json.dumps(body).encode("utf-8")
    req  = ur.Request(f"{BASE}{path}", data=data,
                      headers={"Content-Type":"application/json"}, method="PUT")
    try:
        with ur.urlopen(req) as r: return json.loads(r.read())
    except: return None

if len(created_orders) >= 8:
    put(f"/api/work-orders/{created_orders[0]['_id']}", {"status":"IN_PROG",  "actual_start":"2026-05-20"})
    put(f"/api/work-orders/{created_orders[1]['_id']}", {"status":"IN_PROG",  "actual_start":"2026-05-21"})
    put(f"/api/work-orders/{created_orders[5]['_id']}", {"status":"STOPPED"})
    put(f"/api/work-orders/{created_orders[6]['_id']}", {"status":"DONE",     "actual_start":"2026-05-15","actual_end":"2026-05-18"})
    put(f"/api/work-orders/{created_orders[7]['_id']}", {"status":"DONE",     "actual_start":"2026-05-12","actual_end":"2026-05-14"})
    print("  OK 상태 업데이트 완료")

# ── 3. 생산실적 추가 ─────────────────────────────────────────
print("\n[생산실적]")
# IN_PROG 작업지시에 연결된 실적
if len(created_orders) >= 2:
    prods = [
        {"order_id":created_orders[0]["order_id"],"product_code":"P-002","product_name":"샤프트 B형",
         "planned_qty":30,"actual_qty":15,"defect_qty":1,"process_code":"PROC-02","worker_code":"이영희",
         "work_date":"2026-05-21","start_time":"08:00","end_time":"17:00","note":"1차 분할 생산"},
        {"order_id":created_orders[1]["order_id"],"product_code":"P-003","product_name":"펌프 하우징 C형",
         "planned_qty":15,"actual_qty":8,"defect_qty":0,"process_code":"PROC-01","worker_code":"박민수",
         "work_date":"2026-05-22","start_time":"09:00","end_time":"18:00","note":""},
    ]
    for p in prods:
        post("/api/productions", p)

# 완료된 작업지시에 연결된 실적 (DONE WO에도 실적 추가)
done_prods = [
    {"order_id":created_orders[6]["order_id"],"product_code":"S-001","product_name":"기어 반조립품 A",
     "planned_qty":20,"actual_qty":20,"defect_qty":1,"process_code":"PROC-01","worker_code":"김철수",
     "work_date":"2026-05-17","start_time":"08:00","end_time":"16:30","note":"완료"},
    {"order_id":created_orders[7]["order_id"],"product_code":"P-002","product_name":"샤프트 B형",
     "planned_qty":10,"actual_qty":10,"defect_qty":0,"process_code":"PROC-02","worker_code":"이영희",
     "work_date":"2026-05-13","start_time":"08:30","end_time":"15:00","note":"완료"},
]
prod_ids = []
for p in done_prods:
    r = post("/api/productions", p)
    if r: prod_ids.append(r["_id"])

time.sleep(0.5)

# 완료 처리 (재고 자동 입고 트리거)
for pid in prod_ids:
    r = put(f"/api/productions/{pid}", {"status":"COMPLETED"})
    if r: print(f"  OK 완료처리: {r.get('prod_id')} → good_qty:{r.get('good_qty')}")

# ── 4. 수동 재고 입고 ─────────────────────────────────────────
print("\n[재고 입출고]")
txns = [
    {"txn_type":"IN", "item_code":"M-001","item_name":"철판 2T",                "quantity":800, "unit":"KG", "txn_date":"2026-05-10","note":"정기 구매 입고"},
    {"txn_type":"IN", "item_code":"M-002","item_name":"스테인리스 파이프 50A",  "quantity":300, "unit":"M",  "txn_date":"2026-05-12","note":"구매 입고"},
    {"txn_type":"IN", "item_code":"M-003","item_name":"알루미늄 블록 100x100",  "quantity":60,  "unit":"EA", "txn_date":"2026-05-13","note":"구매 입고"},
    {"txn_type":"IN", "item_code":"M-004","item_name":"볼트 M10x30",            "quantity":5000,"unit":"EA", "txn_date":"2026-05-01","note":"구매 입고"},
    {"txn_type":"OUT","item_code":"M-001","item_name":"철판 2T",                "quantity":150, "unit":"KG", "txn_date":"2026-05-20","note":"WO-002 불출"},
    {"txn_type":"OUT","item_code":"M-003","item_name":"알루미늄 블록 100x100",  "quantity":30,  "unit":"EA", "txn_date":"2026-05-19","note":"WO-006 불출"},
    {"txn_type":"OUT","item_code":"M-004","item_name":"볼트 M10x30",            "quantity":200, "unit":"EA", "txn_date":"2026-05-21","note":"현장 사용"},
    {"txn_type":"IN", "item_code":"M-001","item_name":"철판 2T",                "quantity":200, "unit":"KG", "txn_date":"2026-05-22","note":"추가 구매"},
]
for txn in txns:
    post("/api/inventory/txns", txn)

print("\n시딩 완료!")
