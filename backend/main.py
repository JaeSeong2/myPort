from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict
from dotenv import load_dotenv
import os, time

from routers.work_order   import router as work_order_router,   ensure_indexes as wo_indexes
from routers.master       import router as master_router,       ensure_indexes as master_indexes
from routers.items        import router as items_router,        ensure_indexes as item_indexes
from routers.users        import router as users_router,        ensure_indexes as user_indexes
from routers.production   import router as production_router,   ensure_indexes as prod_indexes
from routers.inventory    import router as inventory_router,    ensure_indexes as inv_indexes
from routers.bom          import router as bom_router,          ensure_indexes as bom_indexes
from routers.quality      import router as quality_router,      ensure_indexes as quality_indexes
from routers.equipment    import router as equipment_router,    ensure_indexes as eq_indexes
from routers.process_flow import router as process_flow_router, ensure_indexes as flow_indexes

load_dotenv()

MONGO_URI   = os.getenv("MONGO_URI")
DB_NAME     = os.getenv("DB_NAME", "myport")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
RATE_LIMIT  = int(os.getenv("RATE_LIMIT", "200"))  # 분당 최대 요청 수
RATE_WINDOW = 60

_req_log: dict = defaultdict(list)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    앱 시작/종료 시 MongoDB 연결 및 해제 처리
    @date 2026-05-23
    """
    app.state.mongo = AsyncIOMotorClient(MONGO_URI)
    app.state.db = app.state.mongo[DB_NAME]
    await wo_indexes(app.state.db)
    await master_indexes(app.state.db)
    await item_indexes(app.state.db)
    await user_indexes(app.state.db)
    await prod_indexes(app.state.db)
    await inv_indexes(app.state.db)
    await bom_indexes(app.state.db)
    await quality_indexes(app.state.db)
    await eq_indexes(app.state.db)
    await flow_indexes(app.state.db)
    yield
    app.state.mongo.close()


# 프로덕션 환경에서 /docs, /redoc 비활성화
app = FastAPI(
    title="MES API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if ENVIRONMENT == "production" else "/docs",
    redoc_url=None if ENVIRONMENT == "production" else "/redoc",
)

# CORS - 허용 출처/메서드/헤더 명시적 제한
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """IP당 분당 RATE_LIMIT 요청 초과 시 429 반환 - 2026-05-24"""
    ip  = request.client.host if request.client else "unknown"
    now = time.time()
    _req_log[ip] = [t for t in _req_log[ip] if t > now - RATE_WINDOW]
    if len(_req_log[ip]) >= RATE_LIMIT:
        return JSONResponse(status_code=429,
                            content={"detail": "요청이 너무 많습니다. 잠시 후 다시 시도하세요."})
    _req_log[ip].append(now)
    return await call_next(request)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """HTTP 보안 헤더 주입 - 클릭재킹·MIME스니핑·XSS 방어 - 2026-05-24"""
    response = await call_next(request)
    response.headers["X-Frame-Options"]           = "DENY"
    response.headers["X-Content-Type-Options"]    = "nosniff"
    response.headers["X-XSS-Protection"]          = "1; mode=block"
    response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]        = "geolocation=(), microphone=(), camera=()"
    return response


app.include_router(work_order_router)
app.include_router(master_router)
app.include_router(items_router)
app.include_router(users_router)
app.include_router(production_router)
app.include_router(inventory_router)
app.include_router(bom_router)
app.include_router(quality_router)
app.include_router(equipment_router)
app.include_router(process_flow_router)


@app.get("/api/health")
async def health():
    """
    서버 상태 확인 엔드포인트
    @date 2026-05-23
    """
    return {"status": "ok", "service": "MES API"}
