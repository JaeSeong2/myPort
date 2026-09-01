"""8월 이전(2026-08-01 미만) 트랜잭션 데이터 삭제 — 8월/마스터는 보존 - 2026-09-01
대상: work_orders(planned_start) / productions(work_date) / inspections(inspect_date) /
      inventory_txns(txn_date). item·employee·equipment·bom 등 마스터는 건드리지 않음.
inventory_txns는 개별 삭제 API가 없어 DB 직접 삭제로 통일한다.
주의: 공유 Atlas(운영 DB)에 즉시 반영되며 되돌릴 수 없음.
사용법: python cleanup_pre_august.py
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME   = os.getenv("DB_NAME", "myport")

# 삭제 경계: 2026-08-01 미만(=4~7월). 8월 이후는 보존.
LO, HI = "2026-01-01", "2026-08-01"   # [LO, HI)  HI 미포함

# (컬렉션, 날짜필드)
TARGETS = [
    ("work_orders",    "planned_start"),
    ("productions",    "work_date"),
    ("inspections",    "inspect_date"),
    ("inventory_txns", "txn_date"),
]

if not MONGO_URI:
    raise SystemExit("[cleanup] MONGO_URI 없음 — backend/.env 확인")

db = MongoClient(MONGO_URI)[DB_NAME]
print(f"[cleanup] DB={DB_NAME}  경계: {LO} <= date < {HI} (8월 이전만 삭제)\n")

total = 0
for coll, field in TARGETS:
    flt = {field: {"$gte": LO, "$lt": HI}}
    before = db[coll].count_documents({})
    match  = db[coll].count_documents(flt)
    res    = db[coll].delete_many(flt)
    after  = db[coll].count_documents({})
    total += res.deleted_count
    print(f"  {coll:<16} 삭제 {res.deleted_count:>3} / 매칭 {match:>3}  (전체 {before} -> {after})")

print(f"\n[cleanup] 완료 - 총 {total}건 삭제 (8월/마스터 보존)")
