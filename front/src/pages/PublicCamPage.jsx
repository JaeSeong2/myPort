// 폰 카메라 송출 페이지 — 카메라 프레임(JPEG)을 WebSocket으로 백엔드에 전송(PC 뷰어가 수신) - 2026-08-02
// QR로 진입하는 공개 페이지(로그인 불필요). 카메라는 HTTPS/localhost에서만 동작.
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react'
import { wsUrl } from '../constants/api'

const SEND_FPS = 8          // 초당 전송 프레임 수
const FRAME_WIDTH = 480     // 전송 프레임 가로 해상도(축소로 대역폭 절약)

export default function PublicCamPage() {
  const [params] = useSearchParams()
  const room = params.get('room') || 'default'

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const wsRef     = useRef(null)
  const streamRef = useRef(null)
  const timerRef  = useRef(0)

  const [camState, setCamState] = useState('starting') // starting | on | error
  const [errMsg,   setErrMsg]   = useState('')
  const [wsOpen,   setWsOpen]   = useState(false)

  useEffect(() => {
    let cancelled = false

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState('error'); setErrMsg('이 환경에서는 카메라를 쓸 수 없습니다. (HTTPS 필요)'); return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        const v = videoRef.current
        v.srcObject = stream
        v.setAttribute('playsinline', 'true')
        await v.play()
        setCamState('on')
        connectWs()
        startSending()
      } catch (e) {
        setCamState('error')
        setErrMsg(e?.name === 'NotAllowedError' ? '카메라 권한이 거부되었습니다.' : '카메라를 시작할 수 없습니다.')
      }
    }

    const connectWs = () => {
      const ws = new WebSocket(wsUrl(`/api/cam/ws?room=${encodeURIComponent(room)}&role=pub`))
      ws.binaryType = 'arraybuffer'
      ws.onopen  = () => setWsOpen(true)
      ws.onclose = () => setWsOpen(false)
      ws.onerror = () => setWsOpen(false)
      wsRef.current = ws
    }

    // 일정 주기로 현재 프레임을 캔버스에 그려 JPEG로 전송 - 2026-08-02
    const startSending = () => {
      const interval = Math.round(1000 / SEND_FPS)
      timerRef.current = setInterval(() => {
        const v = videoRef.current
        const c = canvasRef.current
        const ws = wsRef.current
        if (!v || !c || !ws || ws.readyState !== WebSocket.OPEN) return
        if (v.readyState < v.HAVE_CURRENT_DATA || !v.videoWidth) return
        const ratio = v.videoHeight / v.videoWidth
        c.width  = FRAME_WIDTH
        c.height = Math.round(FRAME_WIDTH * ratio)
        const ctx = c.getContext('2d')
        ctx.drawImage(v, 0, 0, c.width, c.height)
        c.toBlob((blob) => {
          if (blob && ws.readyState === WebSocket.OPEN) {
            blob.arrayBuffer().then((buf) => {
              try { ws.send(buf) } catch { /* noop */ }
            })
          }
        }, 'image/jpeg', 0.55)
      }, interval)
    }

    startCamera()
    return () => {
      cancelled = true
      clearInterval(timerRef.current)
      if (wsRef.current) { try { wsRef.current.close() } catch { /* noop */ } }
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [room])

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
        {/* 헤더 */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-accent shrink-0">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <Camera size={15} /> 카메라 송출
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs"
            style={{ color: wsOpen ? '#34d399' : '#9ca3af' }}>
            {wsOpen ? <Wifi size={13} /> : <WifiOff size={13} />}
            {wsOpen ? '송출 중' : '연결 대기'}
          </span>
        </div>

        {/* 카메라 프리뷰 */}
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-[3/4] border border-theme">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />

          {camState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90">
              <Loader2 size={22} className="animate-spin" /> <span className="text-xs">카메라 여는 중...</span>
            </div>
          )}
          {camState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/90">
              <AlertTriangle size={24} className="text-amber-400" />
              <span className="text-xs leading-relaxed">{errMsg}</span>
            </div>
          )}
          {camState === 'on' && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white flex items-center gap-1"
              style={{ background: 'rgba(239,68,68,0.85)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
        </div>

        <p className="text-xs text-muted text-center leading-relaxed">
          이 화면을 켜두면 PC 관제 화면에 실시간 영상이 전송됩니다.<br />
          카메라를 설비/제품에 비추면 PC에서 AI 객체 인식이 실행됩니다.
        </p>
      </div>
    </div>
  )
}
