// 앱 내장 QR 카메라 스캐너 — getUserMedia로 카메라를 열고 jsQR로 실시간 디코딩 - 2026-08-02
// 카메라는 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작한다.
import { useEffect, useRef, useState } from 'react'
import { X, ScanLine, AlertTriangle, Loader2 } from 'lucide-react'
import jsQR from 'jsqr'
import { useLanguage } from '../../context/LanguageContext'

export default function QrScanner({ open, onClose, onDetected }) {
  const { t } = useLanguage()
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(0)
  const doneRef   = useRef(false) // 중복 인식 방지
  const [status, setStatus] = useState('starting') // starting | scanning | error
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (!open) return
    doneRef.current = false
    setStatus('starting')
    setErrMsg('')

    let cancelled = false

    // 카메라 시작 → 프레임 루프에서 QR 탐지 - 2026-08-02
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setErrMsg(t('qr.noCam'))
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, // 후면 카메라 우선
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true') // iOS 인라인 재생
        await video.play()
        setStatus('scanning')
        rafRef.current = requestAnimationFrame(tick)
      } catch (e) {
        setStatus('error')
        setErrMsg(
          e?.name === 'NotAllowedError'
            ? t('qr.denied')
            : e?.name === 'NotFoundError'
              ? t('qr.notFound')
              : t('qr.startFail')
        )
      }
    }

    // 매 프레임 캔버스에 그린 뒤 jsQR로 디코딩 - 2026-08-02
    const tick = () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || doneRef.current) return
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth
        const h = video.videoHeight
        if (w && h) {
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(video, 0, 0, w, h)
          const img = ctx.getImageData(0, 0, w, h)
          const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
          if (code && code.data) {
            doneRef.current = true
            stop()
            onDetected(code.data)
            return
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    start()
    return () => { cancelled = true; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 카메라·루프 정리 - 2026-08-02
  const stop = () => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="w-full max-w-sm bg-surface rounded-2xl overflow-hidden border border-theme"
        onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <ScanLine size={15} className="text-accent" /> {t('qr.title')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* 카메라 뷰 */}
        <div className="relative bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />

          {/* 스캔 가이드 프레임 */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2/3 aspect-square rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}

          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/90">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-xs">{t('qr.opening')}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/90">
              <AlertTriangle size={24} className="text-amber-400" />
              <span className="text-xs leading-relaxed">{errMsg}</span>
            </div>
          )}
        </div>

        {/* 안내 */}
        <p className="text-xs text-muted text-center px-4 py-3">
          {t('qr.guide')}
        </p>
      </div>
    </div>
  )
}
