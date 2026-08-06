// AI 비전 관제 — 폰 카메라 실시간 영상 수신(WebSocket) + COCO-SSD 객체 감지 오버레이 - 2026-08-02
// 폰(/m/cam)이 송출한 프레임을 받아 캔버스에 그리고, TensorFlow.js로 사물을 인식해 박스로 표시한다.
import { useEffect, useRef, useState } from 'react'
import QRCodeLib from 'qrcode'
import { Camera, Wifi, WifiOff, Loader2, Cpu, AlertTriangle } from 'lucide-react'
import { wsUrl } from '../../../constants/api'

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE || window.location.origin
const camUrl = (room) => `${PUBLIC_BASE}/#/m/cam?room=${encodeURIComponent(room)}`

// 감지 박스 색상 팔레트(클래스별 순환) - 2026-08-02
const BOX_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#f87171']
const colorFor = (cls) => {
  let h = 0
  for (let i = 0; i < cls.length; i++) h = (h + cls.charCodeAt(i)) % BOX_COLORS.length
  return BOX_COLORS[h]
}

export default function VisionMonitorPage() {
  const room = 'default'

  const viewRef  = useRef(null)   // 화면 표시 캔버스(영상 + 박스)
  const rawRef   = useRef(null)   // 감지용 원본 캔버스(오프스크린)
  const wsRef    = useRef(null)
  const modelRef = useRef(null)
  const predsRef = useRef([])
  const runningRef = useRef(true)
  const frameCntRef = useRef(0)

  const [pubOnline,  setPubOnline]  = useState(false)
  const [hasFrame,   setHasFrame]   = useState(false)
  const [modelState, setModelState] = useState('loading') // loading | ready | error
  const [preds,      setPreds]      = useState([])
  const [qrData,     setQrData]     = useState(null)
  const [fps,        setFps]        = useState(0)

  // 폰 접속용 QR 생성 - 2026-08-02
  useEffect(() => {
    QRCodeLib.toDataURL(camUrl(room), { width: 220, margin: 2 }).then(setQrData).catch(() => {})
  }, [])

  // COCO-SSD 모델 로드 — 동적 import로 메인 번들과 분리(사용 시에만 다운로드) - 2026-08-02
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tf = await import('@tensorflow/tfjs')
        await tf.ready()
        const cocoSsd = await import('@tensorflow-models/coco-ssd')
        const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
        if (cancelled) return
        modelRef.current = model
        setModelState('ready')
      } catch {
        if (!cancelled) setModelState('error')
      }
    })()
    return () => { cancelled = true }
  }, [])

  // 캔버스에 프레임 + 감지 박스 그리기 - 2026-08-02
  const drawFrame = (bmp) => {
    const raw = rawRef.current, view = viewRef.current
    if (!raw || !view) return
    const w = bmp.width, h = bmp.height
    if (raw.width !== w)  { raw.width = w; raw.height = h; view.width = w; view.height = h }
    raw.getContext('2d').drawImage(bmp, 0, 0, w, h)
    const ctx = view.getContext('2d')
    ctx.drawImage(bmp, 0, 0, w, h)
    // 박스 오버레이
    ctx.lineWidth = 2
    ctx.font = '14px sans-serif'
    ctx.textBaseline = 'top'
    for (const p of predsRef.current) {
      const [x, y, bw, bh] = p.bbox
      const col = colorFor(p.class)
      ctx.strokeStyle = col
      ctx.strokeRect(x, y, bw, bh)
      const label = `${p.class} ${Math.round(p.score * 100)}%`
      const tw = ctx.measureText(label).width + 8
      ctx.fillStyle = col
      ctx.fillRect(x, Math.max(0, y - 18), tw, 18)
      ctx.fillStyle = '#0b0f14'
      ctx.fillText(label, x + 4, Math.max(0, y - 17))
    }
  }

  // WebSocket 수신 + 감지 루프 - 2026-08-02
  useEffect(() => {
    runningRef.current = true
    const ws = new WebSocket(wsUrl(`/api/cam/ws?room=${encodeURIComponent(room)}&role=viewer`))
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onmessage = async (e) => {
      if (typeof e.data === 'string') {
        try { const m = JSON.parse(e.data); if (m.type === 'pub') setPubOnline(!!m.online) } catch { /* noop */ }
        return
      }
      try {
        const bmp = await createImageBitmap(new Blob([e.data], { type: 'image/jpeg' }))
        if (!runningRef.current) return
        if (!hasFrame) setHasFrame(true)
        frameCntRef.current += 1
        drawFrame(bmp)
        bmp.close?.()
      } catch { /* 디코드 실패 무시 */ }
    }

    // 감지 루프 — 모델 준비 후 원본 캔버스를 주기적으로 추론 - 2026-08-02
    const detect = async () => {
      if (!runningRef.current) return
      const model = modelRef.current
      const raw = rawRef.current
      if (model && raw && raw.width > 0) {
        try {
          const p = await model.detect(raw)
          predsRef.current = p
          setPreds(p)
        } catch { /* noop */ }
      }
      if (runningRef.current) setTimeout(detect, 130)
    }
    detect()

    // FPS 계산(1초마다)
    const fpsTimer = setInterval(() => {
      setFps(frameCntRef.current)
      frameCntRef.current = 0
    }, 1000)

    return () => {
      runningRef.current = false
      clearInterval(fpsTimer)
      try { ws.close() } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 감지 결과 요약(클래스별 개수) - 2026-08-02
  const summary = Object.entries(
    preds.reduce((acc, p) => { acc[p.class] = (acc[p.class] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 overflow-auto">
      {/* ── 좌: 실시간 영상 + 감지 ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-primary font-semibold flex items-center gap-1.5">
            <Camera size={17} className="text-accent" /> AI 비전 관제
          </h2>
          {/* 상태 배지들 */}
          <span className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-theme"
            style={{ color: pubOnline ? '#34d399' : '#9ca3af' }}>
            {pubOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {pubOnline ? '카메라 연결됨' : '카메라 대기'}
          </span>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-theme text-muted">
            <Cpu size={12} />
            {modelState === 'ready' ? 'AI 준비됨' : modelState === 'error' ? 'AI 오류' : 'AI 로딩중'}
          </span>
          {hasFrame && <span className="text-xs text-muted">{fps} fps</span>}
        </div>

        <div className="relative flex-1 min-h-64 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-theme">
          <canvas ref={viewRef} className="max-w-full max-h-full object-contain" />
          <canvas ref={rawRef} className="hidden" />

          {!hasFrame && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 px-6 text-center">
              {modelState === 'error' ? (
                <>
                  <AlertTriangle size={26} className="text-amber-400" />
                  <span className="text-sm">AI 모델 로딩 실패 (네트워크 확인)</span>
                </>
              ) : (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  <span className="text-sm">폰 카메라 연결 대기 중...</span>
                  <span className="text-xs text-white/60">우측 QR을 폰으로 스캔해 카메라를 켜세요</span>
                </>
              )}
            </div>
          )}

          {hasFrame && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold text-white flex items-center gap-1"
              style={{ background: 'rgba(239,68,68,0.85)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
        </div>
      </div>

      {/* ── 우: 폰 연결 QR + 감지 결과 ── */}
      <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
        {/* 폰 연결 QR */}
        <div className="bg-surface border border-theme rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-primary mb-3">폰 카메라 연결</h3>
          <div className="flex flex-col items-center gap-2">
            {qrData ? (
              <img src={qrData} alt="카메라 연결 QR" width={160} height={160}
                className="rounded-lg border border-theme bg-white p-2" />
            ) : (
              <div className="w-40 h-40 rounded-lg border border-theme bg-elevated" />
            )}
            <p className="text-xs text-muted text-center leading-relaxed">
              폰으로 QR을 스캔하면 카메라 송출 화면이 열립니다.<br />
              <span className="text-amber-400">HTTPS 또는 localhost</span>에서만 카메라가 동작합니다.
            </p>
          </div>
        </div>

        {/* 감지 결과 */}
        <div className="bg-surface border border-theme rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-1.5">
            <Cpu size={14} className="text-accent" /> 인식된 사물
            <span className="ml-auto text-xs font-normal text-muted">{preds.length}개</span>
          </h3>
          {summary.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">
              {hasFrame ? '인식된 사물이 없습니다.' : '영상 수신 대기 중...'}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 overflow-y-auto">
              {summary.map(([cls, cnt]) => (
                <div key={cls} className="flex items-center justify-between rounded-lg border border-theme bg-base px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-primary">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorFor(cls) }} />
                    {cls}
                  </span>
                  <span className="text-xs font-semibold text-muted">×{cnt}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted mt-3 pt-3 border-t border-theme leading-relaxed">
            일반 사물 80종 인식(COCO-SSD). 제품·불량 등 현장 특화 인식은 커스텀 학습 모델이 필요합니다.
          </p>
        </div>
      </aside>
    </div>
  )
}
