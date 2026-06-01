"""통합 시드 스크립트 - 2026-05-30
실행 순서: 기존 데이터 삭제 → 기초정보 → 품목 → 작업지시 → 생산실적
          → 재고 → 설비 → 공정흐름 → BOM → 품질검사 → LOT 추적
사용법: python seed.py  (서버가 localhost:8000에서 실행 중이어야 함)
"""
import urllib.request, urllib.error, json, sys, time

BASE = "http://localhost:8000"


def req(method, path, body=None, *, critical=True):
    """HTTP 요청 헬퍼 - critical=True 시 실패하면 즉시 종료 - 2026-05-30"""
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
        msg = e.read().decode()
        print(f"  NG {method} {path} → {e.code} {msg[:100]}")
    except Exception as e:
        print(f"  NG {method} {path} → {e}")
    if critical:
        sys.exit("[seed] 치명적 오류 — 시딩 중단")
    return None


def post(path, body, *, critical=True): return req("POST",   path, body, critical=critical)
def put(path, body):                    return req("PUT",    path, body, critical=False)
def get(path):                          return req("GET",    path,       critical=False)
def delete(path):                       return req("DELETE", path,       critical=False)


def _delete_collection(api, id_key="_id"):
    """컬렉션 전체 삭제 헬퍼 - 2026-05-30"""
    data = get(api)
    if not data:
        return 0
    items = data.get("data", [])
    for item in items:
        delete(f"{api}/{item[id_key]}")
    return len(items)


# ══════════════════════════════════════════════════════
# 0. 기존 데이터 전체 삭제 (역순으로 삭제하여 참조 오류 방지)
# ══════════════════════════════════════════════════════
print("\n[기존 데이터 삭제]")

n = _delete_collection("/api/lots", id_key="lot_no")
if n: print(f"  OK lots {n}건 삭제")

n = _delete_collection("/api/productions")
if n: print(f"  OK productions {n}건 삭제")

n = _delete_collection("/api/work-orders")
if n: print(f"  OK work-orders {n}건 삭제")

delete("/api/inventory/reset")
print("  OK inventory 초기화")

n = _delete_collection("/api/bom")
if n: print(f"  OK bom {n}건 삭제")

n = _delete_collection("/api/quality")
if n: print(f"  OK quality {n}건 삭제")

n = _delete_collection("/api/equipment")
if n: print(f"  OK equipment {n}건 삭제")

n = _delete_collection("/api/process-flow")
if n: print(f"  OK process-flow {n}건 삭제")

n = _delete_collection("/api/items")
if n: print(f"  OK items {n}건 삭제")

for category in ("process", "employee"):
    data = get(f"/api/master?category={category}")
    if data:
        for item in data.get("data", []):
            delete(f"/api/master/{item['_id']}")
        cnt = len(data.get("data", []))
        if cnt: print(f"  OK master({category}) {cnt}건 삭제")

n = _delete_collection("/api/users")
if n: print(f"  OK users {n}건 삭제")


# ══════════════════════════════════════════════════════
# 1. 기초정보 (공정 / 담당자)
# ══════════════════════════════════════════════════════
print("\n[기초정보 - 공정]")
for code, name in [
    ("FORGE",    "단조"),
    ("MACHINE",  "CNC 기계가공"),
    ("HEAT",     "열처리"),
    ("GRIND",    "연삭/호닝"),
    ("ASSEMBLE", "조립"),
    ("INSPECT",  "검사"),
    ("SURFACE",  "표면처리/도장"),
]:
    r = post("/api/master", {"category": "process", "code": code, "name": name, "active": True})
    if r: print(f"  OK {code} {name}")

print("\n[기초정보 - 담당자]")
for code, name in [
    ("EMP-001","김철수"), ("EMP-002","이영희"), ("EMP-003","박민수"),
    ("EMP-004","최지훈"), ("EMP-005","정수현"), ("EMP-006","한동욱"),
    ("EMP-007","홍길동"),
]:
    r = post("/api/master", {"category": "employee", "code": code, "name": name, "active": True})
    if r: print(f"  OK {code} {name}")


# ══════════════════════════════════════════════════════
# 2. 품목
# ══════════════════════════════════════════════════════
print("\n[품목]")
for item in [
    {"code":"P-001","name":"드라이브 샤프트 DS-200",   "item_type":"FINISHED",    "unit":"EA", "spec":"GCD600 Φ38x500",   "unit_price":85000,  "safety_stock":20,   "min_stock":10,  "max_stock":200,   "active":True},
    {"code":"P-002","name":"브레이크 디스크 BD-280",    "item_type":"FINISHED",    "unit":"EA", "spec":"GCI250 Φ280T28",   "unit_price":45000,  "safety_stock":30,   "min_stock":15,  "max_stock":300,   "active":True},
    {"code":"P-003","name":"자동변속기 기어셋 AT-5",    "item_type":"FINISHED",    "unit":"SET","spec":"5단 자동 기어셋",   "unit_price":320000, "safety_stock":10,   "min_stock":5,   "max_stock":80,    "active":True},
    {"code":"P-004","name":"스티어링 너클 SK-L",        "item_type":"FINISHED",    "unit":"EA", "spec":"Al합금 좌측",      "unit_price":62000,  "safety_stock":15,   "min_stock":8,   "max_stock":150,   "active":True},
    {"code":"P-005","name":"서스펜션 로어암 SLA-F",     "item_type":"FINISHED",    "unit":"EA", "spec":"HSLA강 단조",      "unit_price":38000,  "safety_stock":25,   "min_stock":10,  "max_stock":200,   "active":True},
    {"code":"S-001","name":"CV조인트 반조립품",         "item_type":"SEMI",        "unit":"EA", "spec":"볼타입 외측",      "unit_price":28000,  "safety_stock":30,   "min_stock":15,  "max_stock":200,   "active":True},
    {"code":"S-002","name":"브레이크 캘리퍼 반조립품",  "item_type":"SEMI",        "unit":"EA", "spec":"단면 부동형",      "unit_price":35000,  "safety_stock":20,   "min_stock":10,  "max_stock":150,   "active":True},
    {"code":"M-001","name":"고장력강판 SPFH590 1.4T",   "item_type":"RAW",         "unit":"KG", "spec":"590MPa급",         "unit_price":1250,   "safety_stock":2000, "min_stock":500, "max_stock":10000, "active":True},
    {"code":"M-002","name":"알루미늄합금봉 Al6061 Φ50", "item_type":"RAW",         "unit":"KG", "spec":"T6열처리재",       "unit_price":4800,   "safety_stock":500,  "min_stock":200, "max_stock":3000,  "active":True},
    {"code":"M-003","name":"탄소강환봉 S45C Φ80",       "item_type":"RAW",         "unit":"KG", "spec":"조질처리HRC28",    "unit_price":980,    "safety_stock":1000, "min_stock":300, "max_stock":5000,  "active":True},
    {"code":"M-004","name":"구상흑연주철봉 GCD450 Φ200","item_type":"RAW",         "unit":"KG", "spec":"구상흑연 4호",     "unit_price":1650,   "safety_stock":800,  "min_stock":200, "max_stock":4000,  "active":True},
    {"code":"M-005","name":"크롬몰리강 SCM440 Φ60",     "item_type":"RAW",         "unit":"KG", "spec":"조질처리HRC32",    "unit_price":1820,   "safety_stock":600,  "min_stock":150, "max_stock":3000,  "active":True},
    {"code":"C-001","name":"볼트 M12x40 (12.9급)",      "item_type":"CONSUMABLE",  "unit":"EA", "spec":"고장력볼트",       "unit_price":180,    "safety_stock":3000, "min_stock":1000,"max_stock":20000, "active":True},
    {"code":"C-002","name":"수용성 절삭유 (20L)",        "item_type":"CONSUMABLE",  "unit":"CAN","spec":"에멀전형",         "unit_price":45000,  "safety_stock":20,   "min_stock":10,  "max_stock":100,   "active":True},
    {"code":"C-003","name":"연삭숫돌 WA60K 8인치",       "item_type":"CONSUMABLE",  "unit":"EA", "spec":"백색산화알루미나", "unit_price":28000,  "safety_stock":10,   "min_stock":5,   "max_stock":50,    "active":True},
]:
    r = post("/api/items", item)
    if r: print(f"  OK {item['code']} {item['name']}")


# ══════════════════════════════════════════════════════
# 3. 작업지시 (20건)
# ══════════════════════════════════════════════════════
print("\n[작업지시]")
_wo_defs = [
    # (type, priority, product_code, product_name, qty, unit, planned_start, planned_end, assignee, process_code)
    # idx 0-4: DONE
    ("NORMAL","HIGH",  "P-001","드라이브 샤프트 DS-200",  100,"EA", "2026-05-01","2026-05-05","EMP-001","MACHINE"),
    ("NORMAL","MEDIUM","P-002","브레이크 디스크 BD-280",  200,"EA", "2026-05-03","2026-05-07","EMP-002","GRIND"),
    ("NORMAL","HIGH",  "P-004","스티어링 너클 SK-L",       80,"EA", "2026-05-06","2026-05-09","EMP-003","FORGE"),
    ("NORMAL","MEDIUM","S-001","CV조인트 반조립품",        150,"EA", "2026-05-08","2026-05-12","EMP-004","ASSEMBLE"),
    ("URGENT","HIGH",  "P-003","자동변속기 기어셋 AT-5",   30,"SET","2026-05-10","2026-05-14","EMP-005","MACHINE"),
    # idx 5-9: IN_PROG
    ("NORMAL","HIGH",  "P-001","드라이브 샤프트 DS-200",  120,"EA", "2026-05-15","2026-05-20","EMP-001","MACHINE"),
    ("URGENT","HIGH",  "P-002","브레이크 디스크 BD-280",  180,"EA", "2026-05-16","2026-05-21","EMP-002","GRIND"),
    ("NORMAL","MEDIUM","P-005","서스펜션 로어암 SLA-F",    90,"EA", "2026-05-17","2026-05-22","EMP-003","FORGE"),
    ("NORMAL","MEDIUM","S-002","브레이크 캘리퍼 반조립품",100,"EA", "2026-05-18","2026-05-23","EMP-004","ASSEMBLE"),
    ("URGENT","HIGH",  "P-003","자동변속기 기어셋 AT-5",   25,"SET","2026-05-19","2026-05-24","EMP-005","MACHINE"),
    # idx 10-14: PENDING
    ("NORMAL","MEDIUM","P-001","드라이브 샤프트 DS-200",  100,"EA", "2026-05-26","2026-05-30","EMP-001","MACHINE"),
    ("NORMAL","LOW",   "P-002","브레이크 디스크 BD-280",  160,"EA", "2026-05-27","2026-05-31","EMP-002","GRIND"),
    ("NORMAL","MEDIUM","P-004","스티어링 너클 SK-L",       60,"EA", "2026-05-28","2026-06-02","EMP-003","FORGE"),
    ("NORMAL","LOW",   "P-005","서스펜션 로어암 SLA-F",    80,"EA", "2026-05-29","2026-06-03","EMP-006","FORGE"),
    ("REWORK","HIGH",  "P-002","브레이크 디스크 BD-280",   15,"EA", "2026-05-23","2026-05-25","EMP-002","INSPECT"),
    # idx 15-16: STOPPED
    ("NORMAL","MEDIUM","P-004","스티어링 너클 SK-L",       50,"EA", "2026-05-13","2026-05-16","EMP-004","FORGE"),
    ("NORMAL","LOW",   "S-001","CV조인트 반조립품",         80,"EA", "2026-05-14","2026-05-18","EMP-005","ASSEMBLE"),
    # idx 17-19: 추가 DONE
    ("NORMAL","MEDIUM","P-005","서스펜션 로어암 SLA-F",   120,"EA", "2026-05-01","2026-05-04","EMP-006","FORGE"),
    ("NORMAL","HIGH",  "S-002","브레이크 캘리퍼 반조립품", 80,"EA", "2026-04-25","2026-04-29","EMP-004","ASSEMBLE"),
    ("URGENT","HIGH",  "P-001","드라이브 샤프트 DS-200",   50,"EA", "2026-04-28","2026-04-30","EMP-001","MACHINE"),
]

created_wo = []
for tp, pri, pcode, pname, qty, unit, ps, pe, asgn, proc in _wo_defs:
    r = post("/api/work-orders", {
        "type":tp,"priority":pri,"product_code":pcode,"product_name":pname,
        "quantity":qty,"unit":unit,"planned_start":ps,"planned_end":pe,
        "assignee":asgn,"process_code":proc,"note":"",
    })
    created_wo.append(r)
    if r: print(f"  OK {r['order_id']} {pname[:20]}")

time.sleep(0.5)

for i in [0,1,2,3,4,17,18,19]:
    if created_wo[i]:
        wo = _wo_defs[i]
        put(f"/api/work-orders/{created_wo[i]['_id']}", {"status":"DONE","actual_start":wo[6],"actual_end":wo[7]})
for i in [5,6,7,8,9]:
    if created_wo[i]:
        put(f"/api/work-orders/{created_wo[i]['_id']}", {"status":"IN_PROG","actual_start":_wo_defs[i][6]})
for i in [15,16]:
    if created_wo[i]:
        put(f"/api/work-orders/{created_wo[i]['_id']}", {"status":"STOPPED"})
print("  OK 상태 업데이트 완료")

print("\n[작업지시 - EMP-007 홍길동]")
emp007_wo = []
for tp, pri, pcode, pname, qty, unit, ps, pe, proc in [
    ("NORMAL","HIGH",   "P-002","브레이크 디스크 BD-280",    60,"EA", "2026-05-08","2026-05-12","GRIND"),
    ("NORMAL","MEDIUM", "P-001","드라이브 샤프트 DS-200",   120,"EA", "2026-05-27","2026-05-31","MACHINE"),
    ("NORMAL","LOW",    "S-002","브레이크 캘리퍼 반조립품",  80,"EA", "2026-06-02","2026-06-06","ASSEMBLE"),
]:
    r = post("/api/work-orders", {
        "type":tp,"priority":pri,"product_code":pcode,"product_name":pname,
        "quantity":qty,"unit":unit,"planned_start":ps,"planned_end":pe,
        "assignee":"EMP-007","process_code":proc,"note":"",
    })
    emp007_wo.append(r)
    if r: print(f"  OK {r['order_id']} {pname[:20]} → EMP-007")

time.sleep(0.3)
if emp007_wo[0]:
    put(f"/api/work-orders/{emp007_wo[0]['_id']}", {"status":"DONE","actual_start":"2026-05-08","actual_end":"2026-05-12"})
if emp007_wo[1]:
    put(f"/api/work-orders/{emp007_wo[1]['_id']}", {"status":"IN_PROG","actual_start":"2026-05-27"})
print("  OK EMP-007 상태 업데이트")


# ══════════════════════════════════════════════════════
# 4. 생산실적
# ══════════════════════════════════════════════════════
print("\n[생산실적]")

completed_ids = []
for wo_i, pcode, pname, plan, actual, defect, wdate, proc, worker, st, et in [
    (0, "P-001","드라이브 샤프트 DS-200",  100, 98, 2,"2026-05-05","MACHINE", "EMP-001","08:00","18:00"),
    (1, "P-002","브레이크 디스크 BD-280",  200,197, 3,"2026-05-07","GRIND",   "EMP-002","08:00","17:30"),
    (2, "P-004","스티어링 너클 SK-L",       80, 79, 1,"2026-05-09","FORGE",   "EMP-003","08:00","17:00"),
    (3, "S-001","CV조인트 반조립품",        150,148, 2,"2026-05-12","ASSEMBLE","EMP-004","08:00","17:00"),
    (4, "P-003","자동변속기 기어셋 AT-5",   30, 29, 1,"2026-05-14","MACHINE", "EMP-005","08:00","18:30"),
    (17,"P-005","서스펜션 로어암 SLA-F",   120,119, 1,"2026-05-04","FORGE",   "EMP-006","08:00","17:00"),
    (18,"S-002","브레이크 캘리퍼 반조립품", 80, 80, 0,"2026-04-29","ASSEMBLE","EMP-004","08:00","16:30"),
    (19,"P-001","드라이브 샤프트 DS-200",   50, 50, 0,"2026-04-30","MACHINE", "EMP-001","08:00","16:00"),
]:
    if not created_wo[wo_i]: continue
    r = post("/api/productions", {
        "order_id":created_wo[wo_i]["order_id"],"product_code":pcode,"product_name":pname,
        "planned_qty":plan,"actual_qty":actual,"defect_qty":defect,
        "process_code":proc,"worker_code":worker,
        "work_date":wdate,"start_time":st,"end_time":et,"note":"",
    })
    if r:
        completed_ids.append(r["_id"])
        print(f"  OK {r['prod_id']} {pname[:20]}")

time.sleep(0.3)
for pid in completed_ids:
    r = put(f"/api/productions/{pid}", {"status":"COMPLETED"})
    if r: print(f"  OK 완료처리: {r['prod_id']} good:{r['good_qty']}")

for wo_i, pcode, pname, plan, actual, defect, wdate, proc, worker in [
    (5, "P-001","드라이브 샤프트 DS-200",  120, 60, 1,"2026-05-18","MACHINE", "EMP-001"),
    (6, "P-002","브레이크 디스크 BD-280",  180, 90, 2,"2026-05-19","GRIND",   "EMP-002"),
    (7, "P-005","서스펜션 로어암 SLA-F",    90, 45, 0,"2026-05-20","FORGE",   "EMP-003"),
    (8, "S-002","브레이크 캘리퍼 반조립품",100, 50, 1,"2026-05-21","ASSEMBLE","EMP-004"),
    (9, "P-003","자동변속기 기어셋 AT-5",   25, 12, 0,"2026-05-22","MACHINE", "EMP-005"),
]:
    if not created_wo[wo_i]: continue
    r = post("/api/productions", {
        "order_id":created_wo[wo_i]["order_id"],"product_code":pcode,"product_name":pname,
        "planned_qty":plan,"actual_qty":actual,"defect_qty":defect,
        "process_code":proc,"worker_code":worker,
        "work_date":wdate,"start_time":"08:00","end_time":"","note":"진행중",
    })
    if r: print(f"  OK {r['prod_id']} {pname[:20]} (진행중)")

print("\n[생산실적 - EMP-007 홍길동]")
# emp007_wo[0] DONE → COMPLETED 실적
if emp007_wo[0]:
    r = post("/api/productions", {
        "order_id":emp007_wo[0]["order_id"],"product_code":"P-002","product_name":"브레이크 디스크 BD-280",
        "planned_qty":60,"actual_qty":59,"defect_qty":1,
        "process_code":"GRIND","worker_code":"EMP-007",
        "work_date":"2026-05-12","start_time":"08:00","end_time":"17:30","note":"",
    })
    if r:
        put(f"/api/productions/{r['_id']}", {"status":"COMPLETED"})
        print(f"  OK {r['prod_id']} 브레이크 디스크 BD-280 (완료) → EMP-007")

# emp007_wo[1] IN_PROG → 진행중 실적
if emp007_wo[1]:
    r = post("/api/productions", {
        "order_id":emp007_wo[1]["order_id"],"product_code":"P-001","product_name":"드라이브 샤프트 DS-200",
        "planned_qty":120,"actual_qty":45,"defect_qty":0,
        "process_code":"MACHINE","worker_code":"EMP-007",
        "work_date":"2026-05-29","start_time":"08:00","end_time":"","note":"진행중",
    })
    if r: print(f"  OK {r['prod_id']} 드라이브 샤프트 DS-200 (진행중) → EMP-007")


# ══════════════════════════════════════════════════════
# 5. 재고 입출고
# ══════════════════════════════════════════════════════
print("\n[재고 입출고]")
for txn_type, code, name, qty, unit, date, note in [
    ("IN", "M-001","고장력강판 SPFH590 1.4T",   3000,"KG", "2026-05-01","월초 정기구매"),
    ("IN", "M-002","알루미늄합금봉 Al6061 Φ50",  800,"KG", "2026-05-02","월초 구매"),
    ("IN", "M-003","탄소강환봉 S45C Φ80",        2000,"KG", "2026-05-02","월초 구매"),
    ("IN", "M-004","구상흑연주철봉 GCD450 Φ200", 1500,"KG", "2026-05-03","월초 구매"),
    ("IN", "M-005","크롬몰리강 SCM440 Φ60",      1200,"KG", "2026-05-03","월초 구매"),
    ("IN", "C-001","볼트 M12x40 (12.9급)",      10000,"EA", "2026-05-01","소모품 구매"),
    ("IN", "C-002","수용성 절삭유 (20L)",           40,"CAN","2026-05-01","소모품 구매"),
    ("IN", "C-003","연삭숫돌 WA60K 8인치",          20,"EA", "2026-05-01","소모품 구매"),
    ("OUT","M-003","탄소강환봉 S45C Φ80",          600,"KG", "2026-05-05","WO P-001 투입"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",   500,"KG", "2026-05-07","WO P-002 투입"),
    ("OUT","M-002","알루미늄합금봉 Al6061 Φ50",    240,"KG", "2026-05-09","WO P-004 투입"),
    ("OUT","M-005","크롬몰리강 SCM440 Φ60",        360,"KG", "2026-05-12","WO S-001 투입"),
    ("OUT","C-001","볼트 M12x40 (12.9급)",        2000,"EA", "2026-05-14","5월 상반기 사용"),
    ("OUT","C-002","수용성 절삭유 (20L)",            12,"CAN","2026-05-14","5월 상반기 사용"),
    ("IN", "M-003","탄소강환봉 S45C Φ80",         1500,"KG", "2026-05-15","추가 구매"),
    ("IN", "M-001","고장력강판 SPFH590 1.4T",     1500,"KG", "2026-05-16","추가 구매"),
    ("OUT","M-003","탄소강환봉 S45C Φ80",          480,"KG", "2026-05-18","WO P-001 2차 투입"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",   360,"KG", "2026-05-19","WO P-002 2차 투입"),
    ("OUT","M-001","고장력강판 SPFH590 1.4T",      280,"KG", "2026-05-20","WO P-005 투입"),
    ("OUT","C-003","연삭숫돌 WA60K 8인치",           4,"EA", "2026-05-20","연삭 공정 교체"),
]:
    r = post("/api/inventory/txns", {
        "txn_type":txn_type,"item_code":code,"item_name":name,
        "quantity":qty,"unit":unit,"txn_date":date,"note":note,
    })
    if r: print(f"  OK {r['txn_id']} {txn_type:3} {name[:22]} {qty}{unit}")


# ══════════════════════════════════════════════════════
# 6. 설비
# ══════════════════════════════════════════════════════
print("\n[설비]")
for eq in [
    {"code":"EQ-P-001","name":"CNC 머시닝센터 1호",   "eq_type":"PRODUCTION", "status":"RUNNING",     "location":"1공장 A-01","manufacturer":"DOOSAN",    "install_date":"2021-03-15","last_pm_date":"2026-04-10","active":True,"note":""},
    {"code":"EQ-P-002","name":"CNC 머시닝센터 2호",   "eq_type":"PRODUCTION", "status":"RUNNING",     "location":"1공장 A-02","manufacturer":"DOOSAN",    "install_date":"2021-03-15","last_pm_date":"2026-04-10","active":True,"note":""},
    {"code":"EQ-P-003","name":"CNC 선반 1호",         "eq_type":"PRODUCTION", "status":"RUNNING",     "location":"1공장 B-01","manufacturer":"HYUNDAI",   "install_date":"2020-07-20","last_pm_date":"2026-03-25","active":True,"note":""},
    {"code":"EQ-P-004","name":"단조 프레스 500T",     "eq_type":"PRODUCTION", "status":"MAINTENANCE", "location":"2공장 C-01","manufacturer":"KOMATSU",   "install_date":"2019-11-01","last_pm_date":"2026-05-20","active":True,"note":"정기 점검 중"},
    {"code":"EQ-P-005","name":"평면 연삭기 1호",      "eq_type":"PRODUCTION", "status":"RUNNING",     "location":"1공장 B-02","manufacturer":"OKAMOTO",   "install_date":"2022-01-10","last_pm_date":"2026-04-28","active":True,"note":""},
    {"code":"EQ-P-006","name":"외경 연삭기 2호",      "eq_type":"PRODUCTION", "status":"IDLE",        "location":"1공장 B-03","manufacturer":"STUDER",    "install_date":"2022-06-15","last_pm_date":"2026-05-05","active":True,"note":"대기 중"},
    {"code":"EQ-P-007","name":"열처리로 1호",         "eq_type":"PRODUCTION", "status":"RUNNING",     "location":"2공장 D-01","manufacturer":"IPSEN",     "install_date":"2020-04-20","last_pm_date":"2026-05-01","active":True,"note":""},
    {"code":"EQ-P-008","name":"자동 조립 라인 1호",   "eq_type":"PRODUCTION", "status":"BREAKDOWN",   "location":"3공장 E-01","manufacturer":"FANUC",     "install_date":"2023-02-01","last_pm_date":"2026-05-15","active":True,"note":"서보모터 고장 수리 요청"},
    {"code":"EQ-U-001","name":"스크류 컴프레서 15kW", "eq_type":"UTILITY",    "status":"RUNNING",     "location":"유틸동 F-01","manufacturer":"INGERSOLL","install_date":"2020-01-05","last_pm_date":"2026-04-01","active":True,"note":""},
    {"code":"EQ-U-002","name":"냉각수 순환 시스템",   "eq_type":"UTILITY",    "status":"RUNNING",     "location":"유틸동 F-02","manufacturer":"CARRIER",   "install_date":"2020-01-05","last_pm_date":"2026-03-15","active":True,"note":""},
    {"code":"EQ-S-001","name":"화재감지 시스템",      "eq_type":"SAFETY",     "status":"RUNNING",     "location":"전체 공장", "manufacturer":"SIEMENS",   "install_date":"2019-06-01","last_pm_date":"2026-01-10","active":True,"note":""},
    {"code":"EQ-S-002","name":"국소 배기 시스템 1호", "eq_type":"SAFETY",     "status":"RUNNING",     "location":"2공장 C구역","manufacturer":"NILFISK",   "install_date":"2021-05-10","last_pm_date":"2026-02-20","active":True,"note":""},
    {"code":"EQ-I-001","name":"3D 좌표측정기 (CMM)",  "eq_type":"INSPECTION", "status":"RUNNING",     "location":"검사실 G-01","manufacturer":"ZEISS",    "install_date":"2022-09-01","last_pm_date":"2026-05-10","active":True,"note":""},
    {"code":"EQ-I-002","name":"로크웰 경도 측정기",   "eq_type":"INSPECTION", "status":"IDLE",        "location":"검사실 G-02","manufacturer":"MITUTOYO", "install_date":"2021-11-15","last_pm_date":"2026-03-30","active":True,"note":""},
    {"code":"EQ-I-003","name":"표면 조도 측정기",     "eq_type":"INSPECTION", "status":"RUNNING",     "location":"검사실 G-02","manufacturer":"MITUTOYO", "install_date":"2023-03-20","last_pm_date":"2026-04-20","active":True,"note":""},
]:
    r = post("/api/equipment", eq)
    if r: print(f"  OK {eq['code']} {eq['name']}")


# ══════════════════════════════════════════════════════
# 7. 공정흐름
# ══════════════════════════════════════════════════════
print("\n[공정흐름]")
for pcode, proc_code, proc_name, seq, cycle, note in [
    ("P-001","MACHINE","CNC 기계가공", 1, 45.0, "선삭 → 밀링 → 드릴링"),
    ("P-001","HEAT",   "열처리",       2,180.0, "고주파 열처리 HRC50"),
    ("P-001","GRIND",  "연삭/호닝",    3, 30.0, "외경 연삭 Ra0.8"),
    ("P-001","INSPECT","검사",         4, 20.0, "치수 전수검사"),
    ("P-002","FORGE",  "단조",         1, 15.0, "500T 프레스 성형"),
    ("P-002","MACHINE","CNC 기계가공", 2, 25.0, "면삭 및 홀 가공"),
    ("P-002","GRIND",  "연삭/호닝",    3, 20.0, "평면 연삭 Ra1.6"),
    ("P-002","SURFACE","표면처리/도장",4, 60.0, "산화 방지 도장"),
    ("P-002","INSPECT","검사",         5, 15.0, "두께 전수검사"),
    ("P-003","MACHINE","CNC 기계가공", 1, 90.0, "기어 치형 가공"),
    ("P-003","HEAT",   "열처리",       2,240.0, "침탄 열처리 HRC60"),
    ("P-003","GRIND",  "연삭/호닝",    3, 60.0, "기어 연삭 JIS 4급"),
    ("P-003","ASSEMBLE","조립",        4,120.0, "AT-5 기어셋 완조립"),
    ("P-003","INSPECT","검사",         5, 30.0, "노이즈 및 치수 검사"),
    ("P-004","FORGE",  "단조",         1, 20.0, "알루미늄 단조 성형"),
    ("P-004","MACHINE","CNC 기계가공", 2, 55.0, "보어 및 나사 가공"),
    ("P-004","HEAT",   "열처리",       3,120.0, "T6 인공시효 처리"),
    ("P-004","SURFACE","표면처리/도장",4, 45.0, "아노다이징 처리"),
    ("P-004","INSPECT","검사",         5, 20.0, "3D CMM 측정"),
    ("P-005","FORGE",  "단조",         1, 25.0, "강판 프레스 성형"),
    ("P-005","MACHINE","CNC 기계가공", 2, 35.0, "보어 및 용접부 가공"),
    ("P-005","SURFACE","표면처리/도장",3, 50.0, "전착도장 ED-coat"),
    ("P-005","INSPECT","검사",         4, 15.0, "비틀림 강성 검사"),
    ("S-001","MACHINE","CNC 기계가공", 1, 40.0, "볼 트랙 정밀 가공"),
    ("S-001","HEAT",   "열처리",       2,150.0, "침탄 열처리"),
    ("S-001","ASSEMBLE","조립",        3, 30.0, "볼 + 케이지 조립"),
    ("S-001","INSPECT","검사",         4, 15.0, "볼 트랙 정밀도 측정"),
    ("S-002","MACHINE","CNC 기계가공", 1, 50.0, "실린더 보어 가공"),
    ("S-002","ASSEMBLE","조립",        2, 45.0, "피스톤 + 씰 조립"),
    ("S-002","INSPECT","검사",         3, 20.0, "누유 압력 검사"),
]:
    r = post("/api/process-flow", {
        "product_code":pcode,"process_code":proc_code,"process_name":proc_name,
        "sequence":seq,"cycle_time":cycle,"note":note,
    })
    if r: print(f"  OK {pcode} [{seq}] {proc_name}")


# ══════════════════════════════════════════════════════
# 8. BOM
# ══════════════════════════════════════════════════════
print("\n[BOM]")
for pcode, mcode, qty, unit, note in [
    ("P-001","M-003", 6.0, "KG", "주소재 탄소강 환봉"),
    ("P-001","M-005", 1.5, "KG", "크롬몰리강 보강 부품"),
    ("P-001","C-001", 4.0, "EA", "체결 볼트"),
    ("P-001","C-002", 0.1, "CAN","절삭유 사용량"),
    ("P-002","M-004", 5.0, "KG", "주소재 구상흑연주철봉"),
    ("P-002","C-001", 8.0, "EA", "체결 볼트"),
    ("P-002","C-003", 0.2, "EA", "연삭 숫돌 (평균 사용량)"),
    ("P-003","M-003", 4.0, "KG", "탄소강 기어 소재"),
    ("P-003","M-005", 3.0, "KG", "크롬몰리강 샤프트 소재"),
    ("P-003","S-001", 1.0, "EA", "CV조인트 반조립"),
    ("P-003","S-002", 1.0, "EA", "캘리퍼 반조립"),
    ("P-003","C-001",20.0, "EA", "체결 볼트"),
    ("P-004","M-002", 3.0, "KG", "알루미늄합금봉 주소재"),
    ("P-004","M-003", 1.0, "KG", "탄소강 보강재"),
    ("P-004","C-001", 6.0, "EA", "체결 볼트"),
    ("P-005","M-001", 2.5, "KG", "고장력강판 주소재"),
    ("P-005","C-001", 4.0, "EA", "체결 볼트"),
    ("S-001","M-005", 2.0, "KG", "크롬몰리강 볼 소재"),
    ("S-001","C-001", 3.0, "EA", "체결 볼트"),
    ("S-002","M-002", 1.5, "KG", "알루미늄합금봉"),
    ("S-002","C-001", 6.0, "EA", "체결 볼트"),
    ("S-002","C-002", 0.05,"CAN","절삭유 사용량"),
]:
    r = post("/api/bom", {"product_code":pcode,"material_code":mcode,"quantity":qty,"unit":unit,"note":note})
    if r: print(f"  OK {pcode} ← {mcode} {qty}{unit}")


# ══════════════════════════════════════════════════════
# 9. 품질검사
# ══════════════════════════════════════════════════════
print("\n[품질검사]")
for pcode, pname, insp_type, qty, passed, failed, inspector, insp_date, note in [
    ("M-003","탄소강환봉 S45C Φ80",       "INCOMING",   2000,1998,  2,"EMP-006","2026-05-02","입고 수입검사"),
    ("M-004","구상흑연주철봉 GCD450 Φ200","INCOMING",   1500,1500,  0,"EMP-006","2026-05-03","입고 수입검사 - 전량합격"),
    ("M-001","고장력강판 SPFH590 1.4T",   "INCOMING",   3000,2970, 30,"EMP-006","2026-05-01","표면 결함 30KG 반품처리"),
    ("M-002","알루미늄합금봉 Al6061 Φ50", "INCOMING",    800, 800,  0,"EMP-006","2026-05-02","입고 수입검사 - 전량합격"),
    ("C-001","볼트 M12x40 (12.9급)",      "INCOMING",  10000,9950, 50,"EMP-006","2026-05-01","나사산 불량 50EA"),
    ("P-001","드라이브 샤프트 DS-200",    "IN_PROCESS",  100,  98,  2,"EMP-003","2026-05-05","CNC 기계가공 중간검사"),
    ("P-002","브레이크 디스크 BD-280",    "IN_PROCESS",  200, 200,  0,"EMP-003","2026-05-07","연삭 후 치수 전수검사"),
    ("P-004","스티어링 너클 SK-L",        "IN_PROCESS",   80,  75,  5,"EMP-003","2026-05-09","단조 후 균열 불량 5EA"),
    ("P-005","서스펜션 로어암 SLA-F",     "IN_PROCESS",  120, 120,  0,"EMP-003","2026-05-04","용접부 외관검사 전량합격"),
    ("S-001","CV조인트 반조립품",          "IN_PROCESS",  150, 148,  2,"EMP-002","2026-05-12","볼 트랙 정밀도 검사"),
    ("P-001","드라이브 샤프트 DS-200",    "FINAL",        96,  96,  0,"EMP-006","2026-05-06","출하 전 최종검사"),
    ("P-002","브레이크 디스크 BD-280",    "FINAL",       197, 197,  0,"EMP-006","2026-05-08","출하 전 최종검사"),
    ("P-003","자동변속기 기어셋 AT-5",    "FINAL",        29,  28,  1,"EMP-006","2026-05-15","조립 완료 최종검사"),
    ("P-004","스티어링 너클 SK-L",        "FINAL",        75,  70,  5,"EMP-006","2026-05-10","표면처리 후 최종검사"),
    ("P-005","서스펜션 로어암 SLA-F",     "FINAL",       119, 119,  0,"EMP-006","2026-05-05","도장 후 최종검사 전량합격"),
]:
    r = post("/api/quality", {
        "product_code":pcode,"product_name":pname,
        "inspect_type":insp_type,"quantity":qty,
        "passed":passed,"failed":failed,
        "inspector":inspector,"inspect_date":insp_date,"note":note,
    })
    if r: print(f"  OK {r['inspect_id']} {insp_type:11} {pcode}")


# ══════════════════════════════════════════════════════
# 10. LOT 추적
# ══════════════════════════════════════════════════════
print("\n[LOT 생성]")

wo_data = get("/api/work-orders")
wo_by_product: dict = {}
for wo in (wo_data.get("data", []) if wo_data else []):
    pcode = wo.get("product_code")
    if pcode and pcode not in wo_by_product:
        wo_by_product[pcode] = wo

created_lots = []
for pcode, pname, qty, note in [
    ("P-001","드라이브 샤프트 DS-200",  100,"1차 양산 LOT"),
    ("P-001","드라이브 샤프트 DS-200",  100,"2차 양산 LOT"),
    ("P-002","브레이크 디스크 BD-280",  200,"긴급 발주 대응"),
    ("P-003","자동변속기 기어셋 AT-5",   50,""),
    ("P-004","스티어링 너클 SK-L",      150,""),
    ("P-005","서스펜션 로어암 SLA-F",   120,""),
    ("S-001","CV조인트 반조립품",         80,"수출향"),
    ("S-002","브레이크 캘리퍼 반조립품", 60,""),
]:
    wo = wo_by_product.get(pcode)
    r = post("/api/lots", {
        "order_id":   wo["order_id"] if wo else f"WO-MANUAL-{pcode}",
        "product_code": pcode, "product_name": pname,
        "planned_qty": qty, "note": note,
    })
    created_lots.append(r)
    if r: print(f"  OK {r['lot_no']} | {pname} | {qty}개")

print("\n[공정 로그 업데이트]")
_EMP = ["EMP-001","EMP-002","EMP-003","EMP-004","EMP-005"]


def _update_lot_logs(lot_no, scenario):
    """LOT 공정 로그에 시나리오 반영 - 2026-05-30"""
    detail = get(f"/api/lots/{lot_no}/detail")
    if not detail:
        return
    logs = sorted(detail.get("process_logs", []), key=lambda l: l["sequence"])
    for seq, status, actual_qty, defect_qty, widx in scenario:
        log = next((l for l in logs if l["sequence"] == seq), None)
        if not log:
            continue
        body: dict = {"status": status, "worker_code": _EMP[widx % len(_EMP)]}
        if actual_qty is not None:
            body["actual_qty"] = actual_qty
            body["defect_qty"] = defect_qty
        put(f"/api/lots/{lot_no}/logs/{log['_id']}", body)
    print(f"  OK {lot_no} 공정 업데이트")


# 각 LOT별 시나리오 (sequence, status, actual_qty, defect_qty, worker_idx)
_lot_scenarios = [
    # LOT 0 (P-001 1차): 전 공정 완료
    [(1,"COMPLETED",100,2,0),(2,"COMPLETED",98,0,1),(3,"COMPLETED",98,1,2),(4,"COMPLETED",97,0,3)],
    # LOT 1 (P-001 2차): 3번 공정 진행 중
    [(1,"COMPLETED",100,1,0),(2,"COMPLETED",99,0,1),(3,"IN_PROGRESS",None,None,2)],
    # LOT 2 (P-002): 2번 공정 진행 중
    [(1,"COMPLETED",200,3,3),(2,"IN_PROGRESS",None,None,0)],
    # LOT 3 (P-003): 1번 공정 완료
    [(1,"COMPLETED",50,0,4)],
    # LOT 4 (P-004): 착수 직후 (전 공정 PENDING 유지)
    None,
    # LOT 5 (P-005): ON_HOLD
    [(1,"COMPLETED",120,2,1),(2,"IN_PROGRESS",None,None,2)],
    # LOT 6 (S-001): 3번 공정까지 완료
    [(1,"COMPLETED",80,1,0),(2,"COMPLETED",79,0,1),(3,"COMPLETED",79,2,3)],
    # LOT 7 (S-002): 전 공정 완료
    [(1,"COMPLETED",60,1,4),(2,"COMPLETED",59,0,2),(3,"COMPLETED",59,0,3)],
]

for idx, (lot, scenario) in enumerate(zip(created_lots, _lot_scenarios)):
    if not lot or scenario is None:
        continue
    _update_lot_logs(lot["lot_no"], scenario)

# 최종 상태 업데이트
if created_lots[0]: put(f"/api/lots/{created_lots[0]['lot_no']}", {"status":"COMPLETED"})
if created_lots[5]: put(f"/api/lots/{created_lots[5]['lot_no']}", {"status":"ON_HOLD","note":"원자재 부족으로 보류"})
if created_lots[7]: put(f"/api/lots/{created_lots[7]['lot_no']}", {"status":"COMPLETED"})


# ══════════════════════════════════════════════════════
# 11. 사용자 계정
# ══════════════════════════════════════════════════════
print("\n[사용자 계정]")
_ALL_MENUS = [
    "dashboard","work-orders","productions","inventory",
    "equipment","process-flow","bom","quality","lots","master","users",
]
_WORKER_MENUS = ["dashboard","wo-status","prod-status","prod-report","lot-tracking","qa-inspect"]

for uid, name, role, email, wcode, menus, actions in [
    # ADMIN
    (
        "admin", "관리자", "ADMIN", "jsle4es@gmail.com", "",
        _ALL_MENUS,
        {"add":True,"edit":True,"delete":True,"excel_up":True,"excel_down":True},
    ),
    # 현장 작업자 USER (3명)
    (
        "emp002", "이영희", "USER", "", "EMP-002",
        _WORKER_MENUS,
        {"add":True,"edit":True,"delete":False,"excel_up":False,"excel_down":True},
    ),
    (
        "emp003", "박민수", "USER", "", "EMP-003",
        _WORKER_MENUS,
        {"add":True,"edit":True,"delete":False,"excel_up":False,"excel_down":True},
    ),
    (
        "emp007", "홍길동", "USER", "", "EMP-007",
        _WORKER_MENUS,
        {"add":True,"edit":True,"delete":False,"excel_up":False,"excel_down":True},
    ),
]:
    r = post("/api/users", {
        "user_id":uid,"name":name,"role":role,
        "email":email,"worker_code":wcode,
        "menus":menus,"actions":actions,"active":True,
    })
    if r: print(f"  OK {uid} ({role}) {name}")

print("\n시딩 완료!")
