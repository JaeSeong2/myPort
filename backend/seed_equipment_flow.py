# 설비 + 공정흐름 테스트 데이터 시딩 - 2026-05-24
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

# ── 1. 설비 등록 ─────────────────────────────────────────────
print("\n[설비 등록]")

equipment_list = [
    # 생산 설비
    {"code":"EQ-P-001","name":"CNC 머시닝센터 1호",  "eq_type":"PRODUCTION","status":"RUNNING",
     "location":"1공장 A-01","manufacturer":"DOOSAN","install_date":"2021-03-15","last_pm_date":"2026-04-10","active":True,"note":""},
    {"code":"EQ-P-002","name":"CNC 머시닝센터 2호",  "eq_type":"PRODUCTION","status":"RUNNING",
     "location":"1공장 A-02","manufacturer":"DOOSAN","install_date":"2021-03-15","last_pm_date":"2026-04-10","active":True,"note":""},
    {"code":"EQ-P-003","name":"CNC 선반 1호",        "eq_type":"PRODUCTION","status":"RUNNING",
     "location":"1공장 B-01","manufacturer":"HYUNDAI","install_date":"2020-07-20","last_pm_date":"2026-03-25","active":True,"note":""},
    {"code":"EQ-P-004","name":"단조 프레스 500T",    "eq_type":"PRODUCTION","status":"MAINTENANCE",
     "location":"2공장 C-01","manufacturer":"KOMATSU","install_date":"2019-11-01","last_pm_date":"2026-05-20","active":True,"note":"정기 점검 중"},
    {"code":"EQ-P-005","name":"평면 연삭기 1호",     "eq_type":"PRODUCTION","status":"RUNNING",
     "location":"1공장 B-02","manufacturer":"OKAMOTO","install_date":"2022-01-10","last_pm_date":"2026-04-28","active":True,"note":""},
    {"code":"EQ-P-006","name":"외경 연삭기 2호",     "eq_type":"PRODUCTION","status":"IDLE",
     "location":"1공장 B-03","manufacturer":"STUDER", "install_date":"2022-06-15","last_pm_date":"2026-05-05","active":True,"note":"대기 중"},
    {"code":"EQ-P-007","name":"열처리로 1호",        "eq_type":"PRODUCTION","status":"RUNNING",
     "location":"2공장 D-01","manufacturer":"IPSEN",  "install_date":"2020-04-20","last_pm_date":"2026-05-01","active":True,"note":""},
    {"code":"EQ-P-008","name":"자동 조립 라인 1호",  "eq_type":"PRODUCTION","status":"BREAKDOWN",
     "location":"3공장 E-01","manufacturer":"FANUC",  "install_date":"2023-02-01","last_pm_date":"2026-05-15","active":True,"note":"서보모터 고장 수리 요청"},
    # 유틸리티 설비
    {"code":"EQ-U-001","name":"스크류 컴프레서 15kW","eq_type":"UTILITY","status":"RUNNING",
     "location":"유틸동 F-01","manufacturer":"INGERSOLL","install_date":"2020-01-05","last_pm_date":"2026-04-01","active":True,"note":""},
    {"code":"EQ-U-002","name":"냉각수 순환 시스템",  "eq_type":"UTILITY","status":"RUNNING",
     "location":"유틸동 F-02","manufacturer":"CARRIER","install_date":"2020-01-05","last_pm_date":"2026-03-15","active":True,"note":""},
    # 안전 설비
    {"code":"EQ-S-001","name":"화재감지 시스템",     "eq_type":"SAFETY","status":"RUNNING",
     "location":"전체 공장","manufacturer":"SIEMENS","install_date":"2019-06-01","last_pm_date":"2026-01-10","active":True,"note":""},
    {"code":"EQ-S-002","name":"국소 배기 시스템 1호","eq_type":"SAFETY","status":"RUNNING",
     "location":"2공장 C구역","manufacturer":"NILFISK","install_date":"2021-05-10","last_pm_date":"2026-02-20","active":True,"note":""},
    # 검사 설비
    {"code":"EQ-I-001","name":"3D 좌표측정기 (CMM)", "eq_type":"INSPECTION","status":"RUNNING",
     "location":"검사실 G-01","manufacturer":"ZEISS","install_date":"2022-09-01","last_pm_date":"2026-05-10","active":True,"note":""},
    {"code":"EQ-I-002","name":"로크웰 경도 측정기",  "eq_type":"INSPECTION","status":"IDLE",
     "location":"검사실 G-02","manufacturer":"MITUTOYO","install_date":"2021-11-15","last_pm_date":"2026-03-30","active":True,"note":""},
    {"code":"EQ-I-003","name":"표면 조도 측정기",    "eq_type":"INSPECTION","status":"RUNNING",
     "location":"검사실 G-02","manufacturer":"MITUTOYO","install_date":"2023-03-20","last_pm_date":"2026-04-20","active":True,"note":""},
]

for eq in equipment_list:
    r = post("/api/equipment", eq)
    if r:
        print(f"  OK {eq['code']} {eq['name']} [{eq['status']}]")

# ── 2. 공정 흐름 등록 ────────────────────────────────────────
print("\n[공정 흐름 등록]")

# (product_code, process_code, process_name, sequence, cycle_time, note)
flow_list = [
    # P-001 드라이브 샤프트 DS-200
    ("P-001","MACHINE", "CNC 기계가공", 1, 45.0, "선삭 → 밀링 → 드릴링"),
    ("P-001","HEAT",    "열처리",       2, 180.0,"고주파 열처리 HRC50"),
    ("P-001","GRIND",   "연삭/호닝",    3, 30.0, "외경 연삭 Ra0.8"),
    ("P-001","INSPECT", "검사",         4, 20.0, "치수 전수검사"),

    # P-002 브레이크 디스크 BD-280
    ("P-002","FORGE",   "단조",         1, 15.0, "500T 프레스 성형"),
    ("P-002","MACHINE", "CNC 기계가공", 2, 25.0, "면삭 및 홀 가공"),
    ("P-002","GRIND",   "연삭/호닝",    3, 20.0, "평면 연삭 Ra1.6"),
    ("P-002","SURFACE", "표면처리/도장",4, 60.0, "산화 방지 도장"),
    ("P-002","INSPECT", "검사",         5, 15.0, "두께 전수검사"),

    # P-003 자동변속기 기어셋 AT-5
    ("P-003","MACHINE", "CNC 기계가공", 1, 90.0, "기어 치형 가공"),
    ("P-003","HEAT",    "열처리",       2, 240.0,"침탄 열처리 HRC60"),
    ("P-003","GRIND",   "연삭/호닝",    3, 60.0, "기어 연삭 JIS 4급"),
    ("P-003","ASSEMBLE","조립",         4, 120.0,"AT-5 기어셋 완조립"),
    ("P-003","INSPECT", "검사",         5, 30.0, "노이즈 및 치수 검사"),

    # P-004 스티어링 너클 SK-L
    ("P-004","FORGE",   "단조",         1, 20.0, "알루미늄 단조 성형"),
    ("P-004","MACHINE", "CNC 기계가공", 2, 55.0, "보어 및 나사 가공"),
    ("P-004","HEAT",    "열처리",       3, 120.0,"T6 인공시효 처리"),
    ("P-004","SURFACE", "표면처리/도장",4, 45.0, "아노다이징 처리"),
    ("P-004","INSPECT", "검사",         5, 20.0, "3D CMM 측정"),

    # P-005 서스펜션 로어암 SLA-F
    ("P-005","FORGE",   "단조",         1, 25.0, "강판 프레스 성형"),
    ("P-005","MACHINE", "CNC 기계가공", 2, 35.0, "보어 및 용접부 가공"),
    ("P-005","SURFACE", "표면처리/도장",3, 50.0, "전착도장 ED-coat"),
    ("P-005","INSPECT", "검사",         4, 15.0, "비틀림 강성 검사"),

    # S-001 CV조인트 반조립품
    ("S-001","MACHINE", "CNC 기계가공", 1, 40.0, "볼 트랙 정밀 가공"),
    ("S-001","HEAT",    "열처리",       2, 150.0,"침탄 열처리"),
    ("S-001","ASSEMBLE","조립",         3, 30.0, "볼 + 케이지 조립"),
    ("S-001","INSPECT", "검사",         4, 15.0, "볼 트랙 정밀도 측정"),

    # S-002 브레이크 캘리퍼 반조립품
    ("S-002","MACHINE", "CNC 기계가공", 1, 50.0, "실린더 보어 가공"),
    ("S-002","ASSEMBLE","조립",         2, 45.0, "피스톤 + 씰 조립"),
    ("S-002","INSPECT", "검사",         3, 20.0, "누유 압력 검사"),
]

for prod_code, proc_code, proc_name, seq, cycle, note in flow_list:
    r = post("/api/process-flow", {
        "product_code": prod_code,
        "process_code": proc_code,
        "process_name": proc_name,
        "sequence":     seq,
        "cycle_time":   cycle,
        "note":         note,
    })
    if r:
        print(f"  OK {prod_code} [{seq}] {proc_name}")

print("\n완료!")
