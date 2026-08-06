# 카메라 실시간 영상 중계 라우터 — 폰(publisher) → 백엔드 → PC(viewer) WebSocket 릴레이 - 2026-08-02
# 프레임(JPEG bytes)을 방(room) 단위로 publisher에서 viewer들에게 중계한다.
from fastapi import APIRouter, WebSocket, Query
import json

router = APIRouter(prefix="/api/cam", tags=["카메라 스트림"])

# 방 상태: { room_name: { "publishers": set[WebSocket], "viewers": set[WebSocket] } }
_rooms: dict = {}


def _room(name: str) -> dict:
    return _rooms.setdefault(name, {"publishers": set(), "viewers": set()})


async def _broadcast_text(room: dict, message: dict):
    """viewer들에게 상태 텍스트(JSON) 전송 - 2026-08-02"""
    payload = json.dumps(message, ensure_ascii=False)
    for v in list(room["viewers"]):
        try:
            await v.send_text(payload)
        except Exception:
            room["viewers"].discard(v)


@router.websocket("/ws")
async def cam_ws(ws: WebSocket, room: str = Query("default"), role: str = Query("viewer")):
    """카메라 프레임 릴레이 — role=pub(송출) / role=viewer(수신) - 2026-08-02"""
    await ws.accept()
    r = _room(room)

    if role == "pub":
        r["publishers"].add(ws)
        await _broadcast_text(r, {"type": "pub", "online": True})
        try:
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                data = msg.get("bytes")
                if data is None:
                    continue
                # 수신한 프레임을 모든 viewer에게 중계
                for v in list(r["viewers"]):
                    try:
                        await v.send_bytes(data)
                    except Exception:
                        r["viewers"].discard(v)
        except Exception:
            pass
        finally:
            r["publishers"].discard(ws)
            await _broadcast_text(r, {"type": "pub", "online": len(r["publishers"]) > 0})
    else:
        r["viewers"].add(ws)
        # 접속 즉시 현재 송출 상태 통보
        try:
            await ws.send_text(json.dumps({"type": "pub", "online": len(r["publishers"]) > 0}))
        except Exception:
            pass
        try:
            while True:
                msg = await ws.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                # viewer가 보내는 메시지는 연결 유지용 — 무시
        except Exception:
            pass
        finally:
            r["viewers"].discard(ws)

    # 빈 방 정리
    if not r["publishers"] and not r["viewers"]:
        _rooms.pop(room, None)
