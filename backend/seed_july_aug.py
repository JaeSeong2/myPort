"""7·8월 임시 시드 스크립트 - 2026-07-06
대시보드 월간 KPI / 일별 차트 조회가 되도록 7월·8월 데이터를 추가한다.
(작업지시 / 생산실적 / 재고 입출고 / 품질검사)
기존 데이터는 유지하며 추가만 한다.
사용법: python seed_july_aug.py  (서버가 localhost:8000에서 실행 중이어야 함)
"""
import urllib.request, urllib.error, json, sys, time

BASE = "http://localhost:8000"


def req(method, path, body=None, *, critical=True):
    """HTTP 요청 헬퍼 - critical=True 시 실패하면 즉시 종료 - 2026-07-06"""
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
        sys.exit("[seed_july_aug] 치명적 오류 — 시딩 중단")
    return None


def post(path, body, *, critical=True): return req("POST", path, body, critical=critical)
def put(path, body):                    return req("PUT",  path, body, critical=False)
def get(path):                          return req("GET",  path,       critical=False)


def seed_month(tag, wo_defs, prod_done, prod_ongoing, inv_txns, qa_recs):
    """월별 데이터 시딩 공통 로직 - 2026-07-06
    wo_defs: 작업지시 정의 리스트 (앞 5건 DONE, 그 다음 4건 IN_PROG, 나머지 PENDING)
    prod_done/prod_ongoing: (wo_idx, plan, actual, defect, wdate, proc, worker)
    """
    # ── 1. 작업지시 생성 ──────────────────────────────
    print(f"\n[{tag} 작업지시]")
    created = []
    for tp, pri, pcode, pname, qty, unit, ps, pe, asgn, proc in wo_defs:
        r = post("/api/work-orders", {
            "type": tp, "priority": pri, "product_code": pcode, "product_name": pname,
            "quantity": qty, "unit": unit, "planned_start": ps, "planned_end": pe,
            "assignee": asgn, "process_code": proc, "note": "",
        })
        created.append(r)
        if r:
            print(f"  OK {r['order_id']} {pname[:20]}")

    time.sleep(0.5)

    # 앞 5건 → DONE, 다음 4건(5~8) → IN_PROG, 나머지는 PENDING 유지
    for i in range(min(5, len(wo_defs))):
        if created[i]:
            put(f"/api/work-orders/{created[i]['_id']}",
                {"status": "DONE", "actual_start": wo_defs[i][6], "actual_end": wo_defs[i][7]})
    for i in range(5, min(9, len(wo_defs))):
        if created[i]:
            put(f"/api/work-orders/{created[i]['_id']}",
                {"status": "IN_PROG", "actual_start": wo_defs[i][6]})
    print(f"  OK {tag} 작업지시 상태 업데이트 완료")

    # ── 2. 생산실적 (완료) ────────────────────────────
    print(f"\n[{tag} 생산실적 - 완료]")
    done_ids = []
    for wo_idx, plan, actual, defect, wdate, proc, worker in prod_done:
        wo = created[wo_idx]
        if not wo:
            continue
        r = post("/api/productions", {
            "order_id":     wo["order_id"],
            "product_code": wo_defs[wo_idx][2],
            "product_name": wo_defs[wo_idx][3],
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
            done_ids.append(r["_id"])
            print(f"  OK {r['prod_id']} {wo_defs[wo_idx][3][:20]} ({wdate})")

    time.sleep(0.3)
    for pid in done_ids:
        r = put(f"/api/productions/{pid}", {"status": "COMPLETED"})
        if r:
            print(f"  OK 완료: {r['prod_id']} good:{r['good_qty']}")

    # ── 3. 생산실적 (진행중) ──────────────────────────
    print(f"\n[{tag} 생산실적 - 진행중]")
    for wo_idx, plan, actual, defect, wdate, proc, worker in prod_ongoing:
        wo = created[wo_idx]
        if not wo:
            continue
        r = post("/api/productions", {
            "order_id":     wo["order_id"],
            "product_code": wo_defs[wo_idx][2],
            "product_name": wo_defs[wo_idx][3],
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
            print(f"  OK {r['prod_id']} {wo_defs[wo_idx][3][:20]} (진행중, {wdate})")

    # ── 4. 재고 입출고 ────────────────────────────────
    print(f"\n[{tag} 재고 입출고]")
    for txn_type, code, name, qty, unit, date_str, note in inv_txns:
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

    # ── 5. 품질검사 ───────────────────────────────────
    print(f"\n[{tag} 품질검사]")
    for pcode, pname, insp_type, qty, passed, failed, inspector, insp_date, note in qa_recs:
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


# ══════════════════════════════════════════════════════════════
# 7월 데이터 — 오늘(2026-07-06) 기준 월간 KPI + 일별 차트 노출용
#   완료 실적을 07-01~07-06 날짜로 분산 → 대시보드 일별 차트에 표시됨
# ══════════════════════════════════════════════════════════════
_jul_wo = [
    # 상반기 DONE (0-4)
    ("NORMAL","HIGH",   "P-001","드라이브 샤프트 DS-200",  140,"EA", "2026-07-01","2026-07-06","EMP-001","MACHINE"),
    ("NORMAL","HIGH",   "P-002","브레이크 디스크 BD-280",  210,"EA", "2026-07-01","2026-07-06","EMP-002","GRIND"),
    ("URGENT","HIGH",   "P-003","자동변속기 기어셋 AT-5",   45,"SET","2026-07-02","2026-07-07","EMP-005","MACHINE"),
    ("NORMAL","MEDIUM", "P-004","스티어링 너클 SK-L",      110,"EA", "2026-07-02","2026-07-07","EMP-003","FORGE"),
    ("NORMAL","MEDIUM", "P-005","서스펜션 로어암 SLA-F",   120,"EA", "2026-07-03","2026-07-08","EMP-006","FORGE"),
    # 중반기 IN_PROG (5-8)
    ("NORMAL","HIGH",   "P-001","드라이브 샤프트 DS-200",  150,"EA", "2026-07-04","2026-07-10","EMP-001","MACHINE"),
    ("URGENT","HIGH",   "P-002","브레이크 디스크 BD-280",  200,"EA", "2026-07-05","2026-07-11","EMP-002","GRIND"),
    ("NORMAL","MEDIUM", "S-001","CV조인트 반조립품",        130,"EA", "2026-07-05","2026-07-12","EMP-004","ASSEMBLE"),
    ("NORMAL","MEDIUM", "S-002","브레이크 캘리퍼 반조립품",110,"EA", "2026-07-06","2026-07-12","EMP-007","ASSEMBLE"),
    # 하반기 PENDING (9-12)
    ("NORMAL","MEDIUM", "P-001","드라이브 샤프트 DS-200",  130,"EA", "2026-07-14","2026-07-19","EMP-001","MACHINE"),
    ("NORMAL","LOW",    "P-002","브레이크 디스크 BD-280",  170,"EA", "2026-07-15","2026-07-20","EMP-002","GRIND"),
    ("NORMAL","MEDIUM", "P-004","스티어링 너클 SK-L",       90,"EA", "2026-07-16","2026-07-21","EMP-003","FORGE"),
    ("NORMAL","LOW",    "P-005","서스펜션 로어암 SLA-F",   100,"EA", "2026-07-17","2026-07-22","EMP-006","FORGE"),
]
_jul_prod_done = [
    # 07-01 ~ 07-06 분산 (일별 차트용)
    (0, 140, 138, 2, "2026-07-01", "MACHINE", "EMP-001"),
    (1, 210, 208, 2, "2026-07-02", "GRIND",   "EMP-002"),
    (2,  45,  44, 1, "2026-07-03", "MACHINE", "EMP-005"),
    (3, 110, 108, 2, "2026-07-04", "FORGE",   "EMP-003"),
    (4, 120, 120, 0, "2026-07-05", "FORGE",   "EMP-006"),
    (0, 140, 135, 4, "2026-07-06", "MACHINE", "EMP-001"),
]
_jul_prod_ongoing = [
    (5, 150,  75, 1, "2026-07-04", "MACHINE", "EMP-001"),
    (6, 200, 100, 2, "2026-07-05", "GRIND",   "EMP-002"),
    (7, 130,  55, 0, "2026-07-05", "ASSEMBLE","EMP-004"),
    (8, 110,  40, 1, "2026-07-06", "ASSEMBLE","EMP-007"),
]
_jul_inv = [
    ("IN", "M-001","고장력강판 SPFH590 1.4T",   2600,"KG", "2026-07-01","7월 월초 정기구매"),
    ("IN", "M-002","알루미늄합금봉 Al6061 Φ50",  720,"KG", "2026-07-01","7월 월초 구매"),
    ("IN", "M-003","탄소강환봉 S45C Φ80",        2100,"KG", "2026-07-01","7월 월초 구매"),
    ("IN", "M-004","구상흑연주철봉 GCD450 Φ200", 1900,"KG", "2026-07-01","7월 월초 구매"),
    ("IN", "M-005","크롬몰리강 SCM440 Φ60",      1100,"KG", "2026-07-01","7월 월초 구매"),
    ("IN", "C-001","볼트 M12x40 (12.9급)",       8500,"EA", "2026-07-01","소모품 월초 구매"),
    ("OUT","M-003","탄소강환봉 S45C Φ80",         560,"KG", "2026-07-01","WO P-001 투입"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",  630,"KG", "2026-07-02","WO P-002 투입"),
    ("OUT","M-003","탄소강환봉 S45C Φ80",         220,"KG", "2026-07-03","WO P-003 기어 소재"),
    ("OUT","M-002","알루미늄합금봉 Al6061 Φ50",   330,"KG", "2026-07-04","WO P-004 투입"),
    ("OUT","M-001","고장력강판 SPFH590 1.4T",     300,"KG", "2026-07-05","WO P-005 투입"),
    ("OUT","C-001","볼트 M12x40 (12.9급)",       2000,"EA", "2026-07-06","7월 상반기 사용"),
]
_jul_qa = [
    ("M-003","탄소강환봉 S45C Φ80",       "INCOMING",  2100,2100,  0,"EMP-006","2026-07-01","7월 입고 전량합격"),
    ("M-004","구상흑연주철봉 GCD450 Φ200","INCOMING",  1900,1896,  4,"EMP-006","2026-07-01","표면 기포 4KG 반품"),
    ("M-001","고장력강판 SPFH590 1.4T",   "INCOMING",  2600,2600,  0,"EMP-006","2026-07-01","7월 입고 전량합격"),
    ("P-001","드라이브 샤프트 DS-200",    "IN_PROCESS",  140, 138,  2,"EMP-003","2026-07-01","CNC 가공 치수 검사"),
    ("P-002","브레이크 디스크 BD-280",    "IN_PROCESS",  210, 210,  0,"EMP-003","2026-07-02","연삭 후 평면도 전수검사"),
    ("P-003","자동변속기 기어셋 AT-5",    "IN_PROCESS",   45,  44,  1,"EMP-003","2026-07-03","기어 치형 정밀도 검사"),
    ("P-004","스티어링 너클 SK-L",        "IN_PROCESS",  110, 108,  2,"EMP-003","2026-07-04","단조 균열 불량 2EA"),
    ("P-005","서스펜션 로어암 SLA-F",     "IN_PROCESS",  120, 120,  0,"EMP-003","2026-07-05","용접부 비파괴검사 합격"),
    ("P-001","드라이브 샤프트 DS-200",    "FINAL",       136, 136,  0,"EMP-006","2026-07-06","출하 전 최종검사 합격"),
    ("P-002","브레이크 디스크 BD-280",    "FINAL",       206, 205,  1,"EMP-006","2026-07-06","도장 불량 1EA 재작업"),
]


# ══════════════════════════════════════════════════════════════
# 8월 데이터 — 다음 달 조회 대비 (8월 진입 시 월간 KPI 노출)
# ══════════════════════════════════════════════════════════════
_aug_wo = [
    ("NORMAL","HIGH",   "P-001","드라이브 샤프트 DS-200",  150,"EA", "2026-08-03","2026-08-08","EMP-001","MACHINE"),
    ("NORMAL","HIGH",   "P-002","브레이크 디스크 BD-280",  220,"EA", "2026-08-03","2026-08-08","EMP-002","GRIND"),
    ("URGENT","HIGH",   "P-003","자동변속기 기어셋 AT-5",   50,"SET","2026-08-04","2026-08-10","EMP-005","MACHINE"),
    ("NORMAL","MEDIUM", "P-004","스티어링 너클 SK-L",      120,"EA", "2026-08-04","2026-08-10","EMP-003","FORGE"),
    ("NORMAL","MEDIUM", "P-005","서스펜션 로어암 SLA-F",   130,"EA", "2026-08-05","2026-08-11","EMP-006","FORGE"),
    ("NORMAL","HIGH",   "P-001","드라이브 샤프트 DS-200",  160,"EA", "2026-08-11","2026-08-17","EMP-001","MACHINE"),
    ("URGENT","HIGH",   "P-002","브레이크 디스크 BD-280",  210,"EA", "2026-08-12","2026-08-18","EMP-002","GRIND"),
    ("NORMAL","MEDIUM", "S-001","CV조인트 반조립품",        140,"EA", "2026-08-12","2026-08-19","EMP-004","ASSEMBLE"),
    ("NORMAL","MEDIUM", "S-002","브레이크 캘리퍼 반조립품",120,"EA", "2026-08-13","2026-08-19","EMP-007","ASSEMBLE"),
    ("NORMAL","MEDIUM", "P-001","드라이브 샤프트 DS-200",  140,"EA", "2026-08-20","2026-08-25","EMP-001","MACHINE"),
    ("NORMAL","LOW",    "P-002","브레이크 디스크 BD-280",  180,"EA", "2026-08-21","2026-08-26","EMP-002","GRIND"),
    ("NORMAL","MEDIUM", "P-004","스티어링 너클 SK-L",      100,"EA", "2026-08-22","2026-08-27","EMP-003","FORGE"),
]
_aug_prod_done = [
    (0, 150, 148, 2, "2026-08-08", "MACHINE", "EMP-001"),
    (1, 220, 217, 3, "2026-08-08", "GRIND",   "EMP-002"),
    (2,  50,  49, 1, "2026-08-10", "MACHINE", "EMP-005"),
    (3, 120, 118, 2, "2026-08-10", "FORGE",   "EMP-003"),
    (4, 130, 130, 0, "2026-08-11", "FORGE",   "EMP-006"),
]
_aug_prod_ongoing = [
    (5, 160,  80, 1, "2026-08-14", "MACHINE", "EMP-001"),
    (6, 210, 105, 2, "2026-08-15", "GRIND",   "EMP-002"),
    (7, 140,  60, 0, "2026-08-16", "ASSEMBLE","EMP-004"),
    (8, 120,  50, 1, "2026-08-17", "ASSEMBLE","EMP-007"),
]
_aug_inv = [
    ("IN", "M-001","고장력강판 SPFH590 1.4T",   2700,"KG", "2026-08-03","8월 월초 정기구매"),
    ("IN", "M-002","알루미늄합금봉 Al6061 Φ50",  750,"KG", "2026-08-03","8월 월초 구매"),
    ("IN", "M-003","탄소강환봉 S45C Φ80",        2200,"KG", "2026-08-03","8월 월초 구매"),
    ("IN", "M-004","구상흑연주철봉 GCD450 Φ200", 2000,"KG", "2026-08-03","8월 월초 구매"),
    ("IN", "M-005","크롬몰리강 SCM440 Φ60",      1200,"KG", "2026-08-03","8월 월초 구매"),
    ("IN", "C-001","볼트 M12x40 (12.9급)",       9000,"EA", "2026-08-03","소모품 월초 구매"),
    ("OUT","M-003","탄소강환봉 S45C Φ80",         600,"KG", "2026-08-08","WO P-001 투입"),
    ("OUT","M-004","구상흑연주철봉 GCD450 Φ200",  660,"KG", "2026-08-08","WO P-002 투입"),
    ("OUT","M-002","알루미늄합금봉 Al6061 Φ50",   360,"KG", "2026-08-10","WO P-004 투입"),
    ("OUT","M-001","고장력강판 SPFH590 1.4T",     325,"KG", "2026-08-11","WO P-005 투입"),
]
_aug_qa = [
    ("M-003","탄소강환봉 S45C Φ80",       "INCOMING",  2200,2200,  0,"EMP-006","2026-08-03","8월 입고 전량합격"),
    ("M-001","고장력강판 SPFH590 1.4T",   "INCOMING",  2700,2700,  0,"EMP-006","2026-08-03","8월 입고 전량합격"),
    ("C-001","볼트 M12x40 (12.9급)",      "INCOMING",  9000,8975, 25,"EMP-006","2026-08-03","도금 불량 25EA"),
    ("P-001","드라이브 샤프트 DS-200",    "IN_PROCESS",  150, 148,  2,"EMP-003","2026-08-08","CNC 가공 치수 검사"),
    ("P-002","브레이크 디스크 BD-280",    "IN_PROCESS",  220, 220,  0,"EMP-003","2026-08-08","연삭 후 평면도 전수검사"),
    ("P-003","자동변속기 기어셋 AT-5",    "IN_PROCESS",   50,  49,  1,"EMP-003","2026-08-10","기어 치형 정밀도 검사"),
    ("P-004","스티어링 너클 SK-L",        "IN_PROCESS",  120, 118,  2,"EMP-003","2026-08-10","단조 균열 불량 2EA"),
    ("P-001","드라이브 샤프트 DS-200",    "FINAL",       146, 146,  0,"EMP-006","2026-08-11","출하 전 최종검사 합격"),
    ("P-002","브레이크 디스크 BD-280",    "FINAL",       216, 215,  1,"EMP-006","2026-08-11","도장 불량 1EA 재작업"),
]


if __name__ == "__main__":
    seed_month("7월", _jul_wo, _jul_prod_done, _jul_prod_ongoing, _jul_inv, _jul_qa)
    seed_month("8월", _aug_wo, _aug_prod_done, _aug_prod_ongoing, _aug_inv, _aug_qa)
    print("\n7·8월 시딩 완료!")
