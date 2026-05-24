# 자동차부품 MES 테스트 데이터 시딩 - 2026-05-23
import urllib.request, urllib.error, json, time

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

def post(path, body):  return req("POST",   path, body)
def put(path, body):   return req("PUT",    path, body)
def delete(path):      return req("DELETE", path)
def get(path):         return req("GET",    path)

# ── 0. 기존 데이터 전체 삭제 ────────────────────────────────
print("\n[기존 데이터 삭제]")

for col, api in [("productions", "/api/productions"), ("work-orders", "/api/work-orders"), ("items", "/api/items")]:
    data = get(api)
    if data:
        for r in data.get("data", []):
            delete(f"{api}/{r['_id']}")
        print(f"  OK {col} {len(data.get('data',[]))}건 삭제")

delete("/api/inventory/reset")
print("  OK inventory 초기화")

# ── 1. 기초정보 (공정 / 담당자) ─────────────────────────────
print("\n[기초정보 - 공정]")
processes = [
    ("FORGE",    "단조"),
    ("MACHINE",  "CNC 기계가공"),
    ("HEAT",     "열처리"),
    ("GRIND",    "연삭/호닝"),
    ("ASSEMBLE", "조립"),
    ("INSPECT",  "검사"),
    ("SURFACE",  "표면처리/도장"),
]
for code, name in processes:
    r = post("/api/master", {"category":"process","code":code,"name":name,"active":True})
    if r: print(f"  OK {code} {name}")

print("\n[기초정보 - 담당자]")
employees = [
    ("EMP-001", "김철수"), ("EMP-002", "이영희"), ("EMP-003", "박민수"),
    ("EMP-004", "최지훈"), ("EMP-005", "정수현"), ("EMP-006", "한동욱"),
]
for code, name in employees:
    r = post("/api/master", {"category":"employee","code":code,"name":name,"active":True})
    if r: print(f"  OK {code} {name}")

# ── 2. 품목 등록 ────────────────────────────────────────────
print("\n[품목]")
items = [
    # 완제품
    {"code":"P-001","name":"드라이브 샤프트 DS-200",  "item_type":"FINISHED","unit":"EA","spec":"GCD600 Φ38x500","unit_price":85000, "safety_stock":20,"min_stock":10,"max_stock":200,"active":True},
    {"code":"P-002","name":"브레이크 디스크 BD-280",   "item_type":"FINISHED","unit":"EA","spec":"GCI250 Φ280T28","unit_price":45000, "safety_stock":30,"min_stock":15,"max_stock":300,"active":True},
    {"code":"P-003","name":"자동변속기 기어셋 AT-5",   "item_type":"FINISHED","unit":"SET","spec":"5단 자동 기어셋","unit_price":320000,"safety_stock":10,"min_stock":5, "max_stock":80, "active":True},
    {"code":"P-004","name":"스티어링 너클 SK-L",       "item_type":"FINISHED","unit":"EA","spec":"Al합금 좌측","unit_price":62000, "safety_stock":15,"min_stock":8, "max_stock":150,"active":True},
    {"code":"P-005","name":"서스펜션 로어암 SLA-F",    "item_type":"FINISHED","unit":"EA","spec":"HSLA강 단조","unit_price":38000, "safety_stock":25,"min_stock":10,"max_stock":200,"active":True},
    # 반제품
    {"code":"S-001","name":"CV조인트 반조립품",        "item_type":"SEMI","unit":"EA","spec":"볼타입 외측","unit_price":28000,"safety_stock":30,"min_stock":15,"max_stock":200,"active":True},
    {"code":"S-002","name":"브레이크 캘리퍼 반조립품", "item_type":"SEMI","unit":"EA","spec":"단면 부동형","unit_price":35000,"safety_stock":20,"min_stock":10,"max_stock":150,"active":True},
    # 원자재
    {"code":"M-001","name":"고장력강판 SPFH590 1.4T",  "item_type":"RAW","unit":"KG","spec":"590MPa급","unit_price":1250,"safety_stock":2000,"min_stock":500,"max_stock":10000,"active":True},
    {"code":"M-002","name":"알루미늄합금봉 Al6061 Φ50","item_type":"RAW","unit":"KG","spec":"T6열처리재","unit_price":4800,"safety_stock":500, "min_stock":200,"max_stock":3000, "active":True},
    {"code":"M-003","name":"탄소강환봉 S45C Φ80",      "item_type":"RAW","unit":"KG","spec":"조질처리HRC28","unit_price":980, "safety_stock":1000,"min_stock":300,"max_stock":5000,"active":True},
    {"code":"M-004","name":"구상흑연주철봉 GCD450 Φ200","item_type":"RAW","unit":"KG","spec":"구상흑연 4호","unit_price":1650,"safety_stock":800, "min_stock":200,"max_stock":4000,"active":True},
    {"code":"M-005","name":"크롬몰리강 SCM440 Φ60",    "item_type":"RAW","unit":"KG","spec":"조질처리HRC32","unit_price":1820,"safety_stock":600, "min_stock":150,"max_stock":3000,"active":True},
    # 소모품
    {"code":"C-001","name":"볼트 M12x40 (12.9급)",     "item_type":"CONSUMABLE","unit":"EA","spec":"고장력볼트","unit_price":180,"safety_stock":3000,"min_stock":1000,"max_stock":20000,"active":True},
    {"code":"C-002","name":"수용성 절삭유 (20L)",       "item_type":"CONSUMABLE","unit":"CAN","spec":"에멀전형","unit_price":45000,"safety_stock":20,"min_stock":10,"max_stock":100,"active":True},
    {"code":"C-003","name":"연삭숫돌 WA60K 8인치",      "item_type":"CONSUMABLE","unit":"EA","spec":"백색산화알루미나","unit_price":28000,"safety_stock":10,"min_stock":5,"max_stock":50,"active":True},
]
item_map = {}
for item in items:
    r = post("/api/items", item)
    if r:
        item_map[item["code"]] = item
        print(f"  OK {item['code']} {item['name']}")

# ── 3. 작업지시 (20건) ──────────────────────────────────────
print("\n[작업지시]")

wo_list = [
    # DONE (완료)
    ("NORMAL","HIGH",  "P-001","드라이브 샤프트 DS-200", 100,"EA","2026-05-01","2026-05-05","EMP-001","MACHINE"),
    ("NORMAL","MEDIUM","P-002","브레이크 디스크 BD-280",  200,"EA","2026-05-03","2026-05-07","EMP-002","GRIND"),
    ("NORMAL","HIGH",  "P-004","스티어링 너클 SK-L",       80,"EA","2026-05-06","2026-05-09","EMP-003","FORGE"),
    ("NORMAL","MEDIUM","S-001","CV조인트 반조립품",        150,"EA","2026-05-08","2026-05-12","EMP-004","ASSEMBLE"),
    ("URGENT","HIGH",  "P-003","자동변속기 기어셋 AT-5",   30,"SET","2026-05-10","2026-05-14","EMP-005","MACHINE"),
    # IN_PROG (진행중)
    ("NORMAL","HIGH",  "P-001","드라이브 샤프트 DS-200",  120,"EA","2026-05-15","2026-05-20","EMP-001","MACHINE"),
    ("URGENT","HIGH",  "P-002","브레이크 디스크 BD-280",  180,"EA","2026-05-16","2026-05-21","EMP-002","GRIND"),
    ("NORMAL","MEDIUM","P-005","서스펜션 로어암 SLA-F",    90,"EA","2026-05-17","2026-05-22","EMP-003","FORGE"),
    ("NORMAL","MEDIUM","S-002","브레이크 캘리퍼 반조립품",100,"EA","2026-05-18","2026-05-23","EMP-004","ASSEMBLE"),
    ("URGENT","HIGH",  "P-003","자동변속기 기어셋 AT-5",   25,"SET","2026-05-19","2026-05-24","EMP-005","MACHINE"),
    # PENDING (대기)
    ("NORMAL","MEDIUM","P-001","드라이브 샤프트 DS-200",  100,"EA","2026-05-26","2026-05-30","EMP-001","MACHINE"),
    ("NORMAL","LOW",   "P-002","브레이크 디스크 BD-280",  160,"EA","2026-05-27","2026-05-31","EMP-002","GRIND"),
    ("NORMAL","MEDIUM","P-004","스티어링 너클 SK-L",       60,"EA","2026-05-28","2026-06-02","EMP-003","FORGE"),
    ("NORMAL","LOW",   "P-005","서스펜션 로어암 SLA-F",    80,"EA","2026-05-29","2026-06-03","EMP-006","FORGE"),
    ("REWORK","HIGH",  "P-002","브레이크 디스크 BD-280",   15,"EA","2026-05-23","2026-05-25","EMP-002","INSPECT"),
    # STOPPED (중단)
    ("NORMAL","MEDIUM","P-004","스티어링 너클 SK-L",       50,"EA","2026-05-13","2026-05-16","EMP-004","FORGE"),
    ("NORMAL","LOW",   "S-001","CV조인트 반조립품",         80,"EA","2026-05-14","2026-05-18","EMP-005","ASSEMBLE"),
    # 추가 DONE
    ("NORMAL","MEDIUM","P-005","서스펜션 로어암 SLA-F",   120,"EA","2026-05-01","2026-05-04","EMP-006","FORGE"),
    ("NORMAL","HIGH",  "S-002","브레이크 캘리퍼 반조립품",80, "EA","2026-04-25","2026-04-29","EMP-004","ASSEMBLE"),
    ("URGENT","HIGH",  "P-001","드라이브 샤프트 DS-200",   50,"EA","2026-04-28","2026-04-30","EMP-001","MACHINE"),
]

# status 분류
done_idx    = [0,1,2,3,4,17,18,19]
inprog_idx  = [5,6,7,8,9]
stopped_idx = [15,16]

created_wo = []
for i, (tp, pri, pcode, pname, qty, unit, ps, pe, asgn, proc) in enumerate(wo_list):
    r = post("/api/work-orders", {
        "type":tp,"priority":pri,"product_code":pcode,"product_name":pname,
        "quantity":qty,"unit":unit,"planned_start":ps,"planned_end":pe,
        "assignee":asgn,"process_code":proc,"note":""
    })
    if r:
        created_wo.append(r)
        print(f"  OK {r['order_id']} {pname[:20]}")
    else:
        created_wo.append(None)

time.sleep(0.5)

# 상태 업데이트
for i in done_idx:
    if created_wo[i]:
        wo = wo_list[i]
        put(f"/api/work-orders/{created_wo[i]['_id']}", {
            "status":"DONE","actual_start":wo[6],"actual_end":wo[7]
        })
for i in inprog_idx:
    if created_wo[i]:
        put(f"/api/work-orders/{created_wo[i]['_id']}", {
            "status":"IN_PROG","actual_start":wo_list[i][6]
        })
for i in stopped_idx:
    if created_wo[i]:
        put(f"/api/work-orders/{created_wo[i]['_id']}", {"status":"STOPPED"})
print("  OK 상태 업데이트 완료")

# ── 4. 생산실적 ──────────────────────────────────────────────
print("\n[생산실적]")

# DONE WO에 연결된 완료 실적
done_prods = [
    (0, "P-001","드라이브 샤프트 DS-200",  100,98, 2,"2026-05-05","MACHINE","EMP-001","08:00","18:00"),
    (1, "P-002","브레이크 디스크 BD-280",  200,197,3,"2026-05-07","GRIND",  "EMP-002","08:00","17:30"),
    (2, "P-004","스티어링 너클 SK-L",       80, 79, 1,"2026-05-09","FORGE",  "EMP-003","08:00","17:00"),
    (3, "S-001","CV조인트 반조립품",        150,148,2,"2026-05-12","ASSEMBLE","EMP-004","08:00","17:00"),
    (4, "P-003","자동변속기 기어셋 AT-5",   30, 29, 1,"2026-05-14","MACHINE","EMP-005","08:00","18:30"),
    (17,"P-005","서스펜션 로어암 SLA-F",   120,119,1,"2026-05-04","FORGE",  "EMP-006","08:00","17:00"),
    (18,"S-002","브레이크 캘리퍼 반조립품",80, 80, 0,"2026-04-29","ASSEMBLE","EMP-004","08:00","16:30"),
    (19,"P-001","드라이브 샤프트 DS-200",   50, 50, 0,"2026-04-30","MACHINE","EMP-001","08:00","16:00"),
]

completed_ids = []
for wo_i, pcode, pname, plan, actual, defect, wdate, proc, worker, stime, etime in done_prods:
    if created_wo[wo_i]:
        r = post("/api/productions", {
            "order_id":created_wo[wo_i]["order_id"],"product_code":pcode,"product_name":pname,
            "planned_qty":plan,"actual_qty":actual,"defect_qty":defect,
            "process_code":proc,"worker_code":worker,
            "work_date":wdate,"start_time":stime,"end_time":etime,"note":""
        })
        if r:
            completed_ids.append(r["_id"])
            print(f"  OK {r['prod_id']} {pname[:20]}")

time.sleep(0.3)
for pid in completed_ids:
    r = put(f"/api/productions/{pid}", {"status":"COMPLETED"})
    if r: print(f"  OK 완료처리: {r['prod_id']} good:{r['good_qty']}")

# IN_PROG WO에 연결된 진행중 실적
ongoing_prods = [
    (5, "P-001","드라이브 샤프트 DS-200",  120,60, 1,"2026-05-18","MACHINE","EMP-001"),
    (6, "P-002","브레이크 디스크 BD-280",  180,90, 2,"2026-05-19","GRIND",  "EMP-002"),
    (7, "P-005","서스펜션 로어암 SLA-F",    90,45, 0,"2026-05-20","FORGE",  "EMP-003"),
    (8, "S-002","브레이크 캘리퍼 반조립품",100,50, 1,"2026-05-21","ASSEMBLE","EMP-004"),
    (9, "P-003","자동변속기 기어셋 AT-5",   25,12, 0,"2026-05-22","MACHINE","EMP-005"),
]
for wo_i, pcode, pname, plan, actual, defect, wdate, proc, worker in ongoing_prods:
    if created_wo[wo_i]:
        r = post("/api/productions", {
            "order_id":created_wo[wo_i]["order_id"],"product_code":pcode,"product_name":pname,
            "planned_qty":plan,"actual_qty":actual,"defect_qty":defect,
            "process_code":proc,"worker_code":worker,
            "work_date":wdate,"start_time":"08:00","end_time":"","note":"진행중"
        })
        if r: print(f"  OK {r['prod_id']} {pname[:20]} (진행중)")

# ── 5. 재고 입출고 ───────────────────────────────────────────
print("\n[재고 입출고]")
txns = [
    # 원자재 구매 입고
    ("IN","M-001","고장력강판 SPFH590 1.4T",  3000,"KG","2026-05-01","월초 정기구매"),
    ("IN","M-002","알루미늄합금봉 Al6061 Φ50",800, "KG","2026-05-02","월초 구매"),
    ("IN","M-003","탄소강환봉 S45C Φ80",      2000,"KG","2026-05-02","월초 구매"),
    ("IN","M-004","구상흑연주철봉 GCD450 Φ200",1500,"KG","2026-05-03","월초 구매"),
    ("IN","M-005","크롬몰리강 SCM440 Φ60",    1200,"KG","2026-05-03","월초 구매"),
    ("IN","C-001","볼트 M12x40 (12.9급)",     10000,"EA","2026-05-01","소모품 구매"),
    ("IN","C-002","수용성 절삭유 (20L)",        40,"CAN","2026-05-01","소모품 구매"),
    ("IN","C-003","연삭숫돌 WA60K 8인치",       20,"EA", "2026-05-01","소모품 구매"),
    # 자재 출고 (생산투입)
    ("OUT","M-003","탄소강환봉 S45C Φ80",      600,"KG","2026-05-05","WO P-001 투입"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",500,"KG","2026-05-07","WO P-002 투입"),
    ("OUT","M-002","알루미늄합금봉 Al6061 Φ50",240,"KG","2026-05-09","WO P-004 투입"),
    ("OUT","M-005","크롬몰리강 SCM440 Φ60",    360,"KG","2026-05-12","WO S-001 투입"),
    ("OUT","C-001","볼트 M12x40 (12.9급)",    2000,"EA","2026-05-14","5월 상반기 사용"),
    ("OUT","C-002","수용성 절삭유 (20L)",        12,"CAN","2026-05-14","5월 상반기 사용"),
    # 추가 구매 입고 (재고 보충)
    ("IN","M-003","탄소강환봉 S45C Φ80",      1500,"KG","2026-05-15","추가 구매"),
    ("IN","M-001","고장력강판 SPFH590 1.4T",  1500,"KG","2026-05-16","추가 구매"),
    # 5월 하반기 출고
    ("OUT","M-003","탄소강환봉 S45C Φ80",      480,"KG","2026-05-18","WO P-001 2차 투입"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",360,"KG","2026-05-19","WO P-002 2차 투입"),
    ("OUT","M-001","고장력강판 SPFH590 1.4T",  280,"KG","2026-05-20","WO P-005 투입"),
    ("OUT","C-003","연삭숫돌 WA60K 8인치",       4,"EA","2026-05-20","연삭 공정 교체"),
]
for txn in txns:
    r = post("/api/inventory/txns", {
        "txn_type":txn[0],"item_code":txn[1],"item_name":txn[2],
        "quantity":txn[3],"unit":txn[4],"txn_date":txn[5],"note":txn[6]
    })
    if r: print(f"  OK {r['txn_id']} {txn[0]:3} {txn[2][:22]} {txn[3]}{txn[4]}")

print("\n완료!")
