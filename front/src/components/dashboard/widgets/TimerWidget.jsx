// 타이머(스톱워치) 위젯 — 작업 시간 측정 - 2026-07-24
import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'

const fmt = (ms) => {
  const total = Math.floor(ms / 1000)
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function TimerWidget() {
  const [elapsed, setElapsed] = useState(0)   // 누적 ms
  const [running, setRunning] = useState(false)
  const startRef = useRef(0)                    // 이번 구간 시작 시각
  const rafRef = useRef(null)

  useEffect(() => {
    if (!running) return
    startRef.current = Date.now()
    const base = elapsed
    const tick = () => {
      setElapsed(base + (Date.now() - startRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setRunning(false); setElapsed(0) }

  return (
    <div className="bg-surface border border-theme rounded-xl p-4">
      <h3 className="text-sm font-semibold text-primary mb-3">타이머</h3>
      <div className="text-center text-3xl font-bold text-primary tabular-nums tracking-tight mb-3">
        {fmt(elapsed)}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning((v) => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:opacity-80 transition-colors">
          {running ? <><Pause size={14} /> 일시정지</> : <><Play size={14} /> 시작</>}
        </button>
        <button onClick={reset}
          className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-muted bg-surface border border-theme hover:text-primary transition-colors">
          <RotateCcw size={14} /> 초기화
        </button>
      </div>
    </div>
  )
}
