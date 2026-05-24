# BOM + 품질검사 테스트 데이터 시딩 - 2026-05-23
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
def get(path):        return req("GET",  path)

# ── 1. BOM 등록 ──────────────────────────────────────────────
print("\n[BOM 등록]")

bom_list = [
    # P-001 드라이브 샤프트 DS-200
    ("P-001", "M-003", 6.0,  "KG",  "주소재 탄소강 환봉"),
    ("P-001", "M-005", 1.5,  "KG",  "크롬몰리강 보강 부품"),
    ("P-001", "C-001", 4.0,  "EA",  "체결 볼트"),
    ("P-001", "C-002", 0.1,  "CAN", "절삭유 사용량"),
    # P-002 브레이크 디스크 BD-280
    ("P-002", "M-004", 5.0,  "KG",  "주소재 구상흑연주철봉"),
    ("P-002", "C-001", 8.0,  "EA",  "체결 볼트"),
    ("P-002", "C-003", 0.2,  "EA",  "연삭 숫돌 (평균 사용량)"),
    # P-003 자동변속기 기어셋 AT-5
    ("P-003", "M-003", 4.0,  "KG",  "탄소강 기어 소재"),
    ("P-003", "M-005", 3.0,  "KG",  "크롬몰리강 샤프트 소재"),
    ("P-003", "S-001", 1.0,  "EA",  "CV조인트 반조립"),
    ("P-003", "S-002", 1.0,  "EA",  "캘리퍼 반조립"),
    ("P-003", "C-001", 20.0, "EA",  "체결 볼트"),
    # P-004 스티어링 너클 SK-L
    ("P-004", "M-002", 3.0,  "KG",  "알루미늄합금봉 주소재"),
    ("P-004", "M-003", 1.0,  "KG",  "탄소강 보강재"),
    ("P-004", "C-001", 6.0,  "EA",  "체결 볼트"),
    # P-005 서스펜션 로어암 SLA-F
    ("P-005", "M-001", 2.5,  "KG",  "고장력강판 주소재"),
    ("P-005", "C-001", 4.0,  "EA",  "체결 볼트"),
    # S-001 CV조인트 반조립품
    ("S-001", "M-005", 2.0,  "KG",  "크롬몰리강 볼 소재"),
    ("S-001", "C-001", 3.0,  "EA",  "체결 볼트"),
    # S-002 브레이크 캘리퍼 반조립품
    ("S-002", "M-002", 1.5,  "KG",  "알루미늄합금봉"),
    ("S-002", "C-001", 6.0,  "EA",  "체결 볼트"),
    ("S-002", "C-002", 0.05, "CAN", "절삭유 사용량"),
]

for prod_code, mat_code, qty, unit, note in bom_list:
    r = post("/api/bom", {
        "product_code": prod_code, "material_code": mat_code,
        "quantity": qty, "unit": unit, "note": note
    })
    if r:
        print(f"  OK {prod_code} <- {mat_code} {qty}{unit}")

# ── 2. 품질검사 데이터 ──────────────────────────────────────
print("\n[품질검사]")

# (product_code, product_name, inspect_type, qty, passed, failed, inspector, inspect_date, note)
inspections = [
    # 수입검사 (INCOMING)
    ("M-003","탄소강환봉 S45C Φ80",       "INCOMING",   2000,1998,  2,"EMP-006","2026-05-02","입고 수입검사"),
    ("M-004","구상흑연주철봉 GCD450 Φ200","INCOMING",   1500,1500,  0,"EMP-006","2026-05-03","입고 수입검사 - 전량합격"),
    ("M-001","고장력강판 SPFH590 1.4T",   "INCOMING",   3000,2970, 30,"EMP-006","2026-05-01","표면 결함 30KG 반품처리"),
    ("M-002","알루미늄합금봉 Al6061 Φ50", "INCOMING",    800, 800,  0,"EMP-006","2026-05-02","입고 수입검사 - 전량합격"),
    ("C-001","볼트 M12x40 (12.9급)",      "INCOMING",  10000,9950, 50,"EMP-006","2026-05-01","나사산 불량 50EA"),
    # 공정검사 (IN_PROCESS)
    ("P-001","드라이브 샤프트 DS-200",    "IN_PROCESS",  100,  98,  2,"EMP-003","2026-05-05","CNC 기계가공 중간검사"),
    ("P-002","브레이크 디스크 BD-280",    "IN_PROCESS",  200, 200,  0,"EMP-003","2026-05-07","연삭 후 치수 전수검사"),
    ("P-004","스티어링 너클 SK-L",        "IN_PROCESS",   80,  75,  5,"EMP-003","2026-05-09","단조 후 균열 불량 5EA"),
    ("P-005","서스펜션 로어암 SLA-F",     "IN_PROCESS",  120, 120,  0,"EMP-003","2026-05-04","용접부 외관검사 전량합격"),
    ("S-001","CV조인트 반조립품",          "IN_PROCESS",  150, 148,  2,"EMP-002","2026-05-12","볼 트랙 정밀도 검사"),
    # 최종검사 (FINAL)
    ("P-001","드라이브 샤프트 DS-200",    "FINAL",        96,  96,  0,"EMP-006","2026-05-06","출하 전 최종검사"),
    ("P-002","브레이크 디스크 BD-280",    "FINAL",       197, 197,  0,"EMP-006","2026-05-08","출하 전 최종검사"),
    ("P-003","자동변속기 기어셋 AT-5",    "FINAL",        29,  28,  1,"EMP-006","2026-05-15","조립 완료 최종검사"),
    ("P-004","스티어링 너클 SK-L",        "FINAL",        75,  70,  5,"EMP-006","2026-05-10","표면처리 후 최종검사"),
    ("P-005","서스펜션 로어암 SLA-F",     "FINAL",       119, 119,  0,"EMP-006","2026-05-05","도장 후 최종검사 전량합격"),
]

for prod_code, prod_name, insp_type, qty, passed, failed, inspector, insp_date, note in inspections:
    r = post("/api/quality", {
        "product_code": prod_code, "product_name": prod_name,
        "inspect_type": insp_type, "quantity": qty,
        "passed": passed, "failed": failed,
        "inspector": inspector, "inspect_date": insp_date, "note": note
    })
    if r:
        print(f"  OK {r['inspect_id']} {insp_type:11} {prod_code} {r['result']}")

print("\n완료!")
