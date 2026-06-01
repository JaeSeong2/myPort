"""6월 기초 시드 스크립트 - 2026-06-01
기존 데이터 유지하면서 6월 데이터(작업지시/생산실적/재고/품질검사)를 추가한다.
사용법: python seed_june.py  (서버가 localhost:8000에서 실행 중이어야 함)
"""
import urllib.request, urllib.error, json, sys, time

BASE = "http://localhost:8000"


def req(method, path, body=None, *, critical=True):
    """HTTP 요청 헬퍼 - critical=True 시 실패하면 즉시 종료 - 2026-06-01"""
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
        print(f"  NG {method} {path} → {e.code} {msg[:120]}")
    except Exception as e:
        print(f"  NG {method} {path} → {e}")
    if critical:
        sys.exit("[seed_june] 치명적 오류 — 시딩 중단")
    return None


def post(path, body, *, critical=True): return req("POST",   path, body, critical=critical)
def put(path, body):                    return req("PUT",    path, body, critical=False)
def get(path):                          return req("GET",    path,       critical=False)


# ══════════════════════════════════════════════════════
# 0. 기존 IN_PROG 작업지시 조회
# ══════════════════════════════════════════════════════
print("\n[기존 IN_PROG 작업지시 조회]")
in_prog_data = get("/api/work-orders?status=IN_PROG")
in_prog_wo   = {wo["product_code"]: wo for wo in (in_prog_data.get("data", []) if in_prog_data else [])}
print(f"  현재 IN_PROG 작업지시: {len(in_prog_wo)}건")


# ══════════════════════════════════════════════════════
# 1. 기존 IN_PROG 작업지시 6월 초 완료 처리
# ══════════════════════════════════════════════════════
print("\n[5월 IN_PROG → 6월 초 완료 처리]")

# 제품코드 → (완료일, 실적날짜, 생산실적 건 추가여부)
_complete_map = {
    "P-001": ("2026-06-03", "2026-06-03", 120, 118, 2, "MACHINE", "EMP-001"),
    "P-002": ("2026-06-04", "2026-06-04", 180, 177, 3, "GRIND",   "EMP-002"),
    "P-005": ("2026-06-05", "2026-06-05",  90,  89, 1, "FORGE",   "EMP-003"),
    "S-002": ("2026-06-04", "2026-06-04", 100,  99, 1, "ASSEMBLE","EMP-004"),
    "P-003": ("2026-06-06", "2026-06-06",  25,  24, 1, "MACHINE", "EMP-005"),
}

june_prod_ids = []
for pcode, (actual_end, wdate, plan, actual, defect, proc, worker) in _complete_map.items():
    wo = in_prog_wo.get(pcode)
    if not wo:
        print(f"  SKIP {pcode} - IN_PROG 작업지시 없음")
        continue

    # 생산실적 추가 (진행중 → 완료분)
    r = post("/api/productions", {
        "order_id":    wo["order_id"],
        "product_code": pcode,
        "product_name": wo["product_name"],
        "planned_qty":  plan,
        "actual_qty":   actual,
        "defect_qty":   defect,
        "process_code": proc,
        "worker_code":  worker,
        "work_date":    wdate,
        "start_time":   "08:00",
        "end_time":     "17:30",
        "note":         "5월 진행분 6월 완료",
    }, critical=False)
    if r:
        june_prod_ids.append(r["_id"])
        print(f"  OK {r['prod_id']} {wo['product_name'][:20]} 실적 생성")

time.sleep(0.3)
for pid in june_prod_ids:
    r = put(f"/api/productions/{pid}", {"status": "COMPLETED"})
    if r:
        print(f"  OK 완료처리: {r['prod_id']} good:{r['good_qty']}")


# ══════════════════════════════════════════════════════
# 2. 6월 신규 작업지시
# ══════════════════════════════════════════════════════
print("\n[6월 신규 작업지시]")
_jun_wo_defs = [
    # 6월 상반기 — DONE 처리 예정 (idx 0-4)
    ("NORMAL","HIGH",   "P-001","드라이브 샤프트 DS-200",  130,"EA", "2026-06-02","2026-06-07","EMP-001","MACHINE"),
    ("NORMAL","HIGH",   "P-002","브레이크 디스크 BD-280",  200,"EA", "2026-06-03","2026-06-08","EMP-002","GRIND"),
    ("URGENT","HIGH",   "P-003","자동변속기 기어셋 AT-5",   40,"SET","2026-06-04","2026-06-10","EMP-005","MACHINE"),
    ("NORMAL","MEDIUM", "P-004","스티어링 너클 SK-L",      100,"EA", "2026-06-05","2026-06-10","EMP-003","FORGE"),
    ("NORMAL","MEDIUM", "P-005","서스펜션 로어암 SLA-F",   110,"EA", "2026-06-06","2026-06-11","EMP-006","FORGE"),
    # 6월 중반기 — IN_PROG 처리 예정 (idx 5-8)
    ("NORMAL","HIGH",   "P-001","드라이브 샤프트 DS-200",  140,"EA", "2026-06-10","2026-06-16","EMP-001","MACHINE"),
    ("URGENT","HIGH",   "P-002","브레이크 디스크 BD-280",  190,"EA", "2026-06-11","2026-06-17","EMP-002","GRIND"),
    ("NORMAL","MEDIUM", "S-001","CV조인트 반조립품",        120,"EA", "2026-06-12","2026-06-18","EMP-004","ASSEMBLE"),
    ("NORMAL","MEDIUM", "S-002","브레이크 캘리퍼 반조립품",100,"EA", "2026-06-13","2026-06-19","EMP-007","ASSEMBLE"),
    # 6월 하반기 — PENDING (idx 9-13)
    ("NORMAL","MEDIUM", "P-001","드라이브 샤프트 DS-200",  120,"EA", "2026-06-20","2026-06-25","EMP-001","MACHINE"),
    ("NORMAL","LOW",    "P-002","브레이크 디스크 BD-280",  160,"EA", "2026-06-21","2026-06-26","EMP-002","GRIND"),
    ("NORMAL","MEDIUM", "P-004","스티어링 너클 SK-L",       80,"EA", "2026-06-23","2026-06-28","EMP-003","FORGE"),
    ("NORMAL","LOW",    "P-005","서스펜션 로어암 SLA-F",    90,"EA", "2026-06-24","2026-06-29","EMP-006","FORGE"),
    ("REWORK","HIGH",   "P-003","자동변속기 기어셋 AT-5",    8,"SET","2026-06-09","2026-06-11","EMP-005","INSPECT"),
]

created_jun_wo = []
for tp, pri, pcode, pname, qty, unit, ps, pe, asgn, proc in _jun_wo_defs:
    r = post("/api/work-orders", {
        "type": tp, "priority": pri, "product_code": pcode, "product_name": pname,
        "quantity": qty, "unit": unit, "planned_start": ps, "planned_end": pe,
        "assignee": asgn, "process_code": proc, "note": "",
    })
    created_jun_wo.append(r)
    if r:
        print(f"  OK {r['order_id']} {pname[:20]}")

time.sleep(0.5)

# 상반기(0-4) → DONE
for i, (tp, pri, pcode, pname, qty, unit, ps, pe, asgn, proc) in enumerate(_jun_wo_defs[:5]):
    if created_jun_wo[i]:
        put(f"/api/work-orders/{created_jun_wo[i]['_id']}",
            {"status": "DONE", "actual_start": ps, "actual_end": pe})

# 중반기(5-8) → IN_PROG
for i in range(5, 9):
    if created_jun_wo[i]:
        put(f"/api/work-orders/{created_jun_wo[i]['_id']}",
            {"status": "IN_PROG", "actual_start": _jun_wo_defs[i][6]})

print("  OK 6월 작업지시 상태 업데이트 완료")


# ══════════════════════════════════════════════════════
# 3. 6월 생산실적 — DONE 작업지시 기반 완료 실적
# ══════════════════════════════════════════════════════
print("\n[6월 생산실적 - 완료]")
_jun_prod_done = [
    # (wo_idx, plan, actual, defect, wdate, proc, worker)
    (0, 130, 128, 2, "2026-06-07", "MACHINE", "EMP-001"),
    (1, 200, 198, 2, "2026-06-08", "GRIND",   "EMP-002"),
    (2,  40,  39, 1, "2026-06-10", "MACHINE", "EMP-005"),
    (3, 100,  98, 2, "2026-06-10", "FORGE",   "EMP-003"),
    (4, 110, 110, 0, "2026-06-11", "FORGE",   "EMP-006"),
]

done_prod_ids = []
for wo_idx, plan, actual, defect, wdate, proc, worker in _jun_prod_done:
    wo = created_jun_wo[wo_idx]
    if not wo:
        continue
    r = post("/api/productions", {
        "order_id":    wo["order_id"],
        "product_code": _jun_wo_defs[wo_idx][2],
        "product_name": _jun_wo_defs[wo_idx][3],
        "planned_qty":  plan,
        "actual_qty":   actual,
        "defect_qty":   defect,
        "process_code": proc,
        "worker_code":  worker,
        "work_date":    wdate,
        "start_time":   "08:00",
        "end_time":     "17:30",
        "note":         "",
    }, critical=False)
    if r:
        done_prod_ids.append(r["_id"])
        print(f"  OK {r['prod_id']} {_jun_wo_defs[wo_idx][3][:20]}")

time.sleep(0.3)
for pid in done_prod_ids:
    r = put(f"/api/productions/{pid}", {"status": "COMPLETED"})
    if r:
        print(f"  OK 완료: {r['prod_id']} good:{r['good_qty']}")


print("\n[6월 생산실적 - 진행중]")
_jun_prod_ongoing = [
    (5, 140,  70, 1, "2026-06-14", "MACHINE", "EMP-001"),
    (6, 190,  95, 2, "2026-06-15", "GRIND",   "EMP-002"),
    (7, 120,  50, 0, "2026-06-16", "ASSEMBLE","EMP-004"),
    (8, 100,  45, 1, "2026-06-17", "ASSEMBLE","EMP-007"),
]
for wo_idx, plan, actual, defect, wdate, proc, worker in _jun_prod_ongoing:
    wo = created_jun_wo[wo_idx]
    if not wo:
        continue
    r = post("/api/productions", {
        "order_id":    wo["order_id"],
        "product_code": _jun_wo_defs[wo_idx][2],
        "product_name": _jun_wo_defs[wo_idx][3],
        "planned_qty":  plan,
        "actual_qty":   actual,
        "defect_qty":   defect,
        "process_code": proc,
        "worker_code":  worker,
        "work_date":    wdate,
        "start_time":   "08:00",
        "end_time":     "",
        "note":         "진행중",
    }, critical=False)
    if r:
        print(f"  OK {r['prod_id']} {_jun_wo_defs[wo_idx][3][:20]} (진행중)")


# ══════════════════════════════════════════════════════
# 4. 6월 재고 입출고
# ══════════════════════════════════════════════════════
print("\n[6월 재고 입출고]")
for txn_type, code, name, qty, unit, date_str, note in [
    # 월초 정기 구매
    ("IN", "M-001","고장력강판 SPFH590 1.4T",   2500,"KG", "2026-06-02","6월 월초 정기구매"),
    ("IN", "M-002","알루미늄합금봉 Al6061 Φ50",  700,"KG", "2026-06-02","6월 월초 구매"),
    ("IN", "M-003","탄소강환봉 S45C Φ80",        2000,"KG", "2026-06-02","6월 월초 구매"),
    ("IN", "M-004","구상흑연주철봉 GCD450 Φ200", 1800,"KG", "2026-06-03","6월 월초 구매"),
    ("IN", "M-005","크롬몰리강 SCM440 Φ60",      1000,"KG", "2026-06-03","6월 월초 구매"),
    ("IN", "C-001","볼트 M12x40 (12.9급)",       8000,"EA", "2026-06-02","소모품 월초 구매"),
    ("IN", "C-002","수용성 절삭유 (20L)",           30,"CAN","2026-06-02","소모품 구매"),
    ("IN", "C-003","연삭숫돌 WA60K 8인치",          15,"EA", "2026-06-02","소모품 구매"),
    # 상반기 투입
    ("OUT","M-003","탄소강환봉 S45C Φ80",          520,"KG", "2026-06-07","WO P-001 투입 (6월 1차)"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",   600,"KG", "2026-06-08","WO P-002 투입 (6월 1차)"),
    ("OUT","M-003","탄소강환봉 S45C Φ80",          200,"KG", "2026-06-10","WO P-003 기어 소재"),
    ("OUT","M-005","크롬몰리강 SCM440 Φ60",        120,"KG", "2026-06-10","WO P-003 샤프트 소재"),
    ("OUT","M-002","알루미늄합금봉 Al6061 Φ50",    300,"KG", "2026-06-10","WO P-004 투입"),
    ("OUT","M-001","고장력강판 SPFH590 1.4T",      275,"KG", "2026-06-11","WO P-005 투입 (6월 1차)"),
    ("OUT","C-001","볼트 M12x40 (12.9급)",        1800,"EA", "2026-06-11","6월 상반기 사용"),
    ("OUT","C-002","수용성 절삭유 (20L)",             8,"CAN","2026-06-11","상반기 사용"),
    # 중반기 추가 구매 및 투입
    ("IN", "M-003","탄소강환봉 S45C Φ80",         1000,"KG", "2026-06-12","중순 추가 구매"),
    ("OUT","M-003","탄소강환봉 S45C Φ80",          560,"KG", "2026-06-14","WO P-001 2차 투입"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",   570,"KG", "2026-06-15","WO P-002 2차 투입"),
    ("OUT","M-005","크롬몰리강 SCM440 Φ60",        240,"KG", "2026-06-16","WO S-001 투입"),
    ("OUT","M-002","알루미늄합금봉 Al6061 Φ50",    225,"KG", "2026-06-17","WO S-002 투입"),
    ("OUT","C-003","연삭숫돌 WA60K 8인치",            3,"EA", "2026-06-17","연삭 공정 교체"),
]:
    r = post("/api/inventory/txns", {
        "txn_type":  txn_type,
        "item_code": code,
        "item_name": name,
        "quantity":  qty,
        "unit":      unit,
        "txn_date":  date_str,
        "note":      note,
    }, critical=False)
    if r:
        print(f"  OK {r['txn_id']} {txn_type:3} {name[:22]} {qty}{unit}")


# ══════════════════════════════════════════════════════
# 5. 6월 품질검사
# ══════════════════════════════════════════════════════
print("\n[6월 품질검사]")
for pcode, pname, insp_type, qty, passed, failed, inspector, insp_date, note in [
    # 입고 수입검사
    ("M-003","탄소강환봉 S45C Φ80",       "INCOMING",  2000,2000,  0,"EMP-006","2026-06-02","6월 입고 전량합격"),
    ("M-004","구상흑연주철봉 GCD450 Φ200","INCOMING",  1800,1795,  5,"EMP-006","2026-06-03","표면 기포 5KG 반품"),
    ("M-001","고장력강판 SPFH590 1.4T",   "INCOMING",  2500,2500,  0,"EMP-006","2026-06-02","6월 입고 전량합격"),
    ("M-002","알루미늄합금봉 Al6061 Φ50", "INCOMING",   700, 700,  0,"EMP-006","2026-06-02","6월 입고 전량합격"),
    ("C-001","볼트 M12x40 (12.9급)",      "INCOMING",  8000,7980, 20,"EMP-006","2026-06-02","도금 불량 20EA"),
    # 공정 중간검사
    ("P-001","드라이브 샤프트 DS-200",    "IN_PROCESS",  130, 128,  2,"EMP-003","2026-06-07","CNC 가공 치수 검사"),
    ("P-002","브레이크 디스크 BD-280",    "IN_PROCESS",  200, 200,  0,"EMP-003","2026-06-08","연삭 후 평면도 전수검사"),
    ("P-003","자동변속기 기어셋 AT-5",    "IN_PROCESS",   40,  39,  1,"EMP-003","2026-06-10","기어 치형 정밀도 검사"),
    ("P-004","스티어링 너클 SK-L",        "IN_PROCESS",  100,  97,  3,"EMP-003","2026-06-10","단조 균열 불량 3EA"),
    ("P-005","서스펜션 로어암 SLA-F",     "IN_PROCESS",  110, 110,  0,"EMP-003","2026-06-11","용접부 비파괴검사 전량합격"),
    # 최종검사
    ("P-001","드라이브 샤프트 DS-200",    "FINAL",       126, 126,  0,"EMP-006","2026-06-08","출하 전 최종검사 전량합격"),
    ("P-002","브레이크 디스크 BD-280",    "FINAL",       196, 195,  1,"EMP-006","2026-06-09","도장 불량 1EA 재작업"),
    ("P-003","자동변속기 기어셋 AT-5",    "FINAL",        38,  38,  0,"EMP-006","2026-06-11","소음 및 진동 검사 합격"),
    ("P-004","스티어링 너클 SK-L",        "FINAL",        95,  94,  1,"EMP-006","2026-06-11","아노다이징 불량 1EA"),
    ("P-005","서스펜션 로어암 SLA-F",     "FINAL",       110, 110,  0,"EMP-006","2026-06-12","도장 후 최종검사 전량합격"),
]:
    r = post("/api/quality", {
        "product_code": pcode,
        "product_name": pname,
        "inspect_type": insp_type,
        "quantity":     qty,
        "passed":       passed,
        "failed":       failed,
        "inspector":    inspector,
        "inspect_date": insp_date,
        "note":         note,
    }, critical=False)
    if r:
        print(f"  OK {r['inspect_id']} {insp_type:11} {pcode}")


print("\n6월 시딩 완료!")
