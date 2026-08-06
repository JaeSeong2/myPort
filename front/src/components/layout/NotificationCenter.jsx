// 알림 센터 — TopBar 종 아이콘 + 미확인 배지 + 드롭다운 목록 - 2026-08-02
// RealtimeContext의 단일 SSE 스트림에서 실시간 알림을 받아 표시한다.
import { useEffect, useRef, useState } from 'react'
import { Bell, AlertTriangle, AlertCircle, Info, Wifi, WifiOff } from 'lucide-react'
import { useRealtime } from '../../context/RealtimeContext'

// 심각도별 색/아이콘 매핑 - 2026-08-02
const LEVEL_STYLE = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.28)', Icon: AlertCircle },
  warning:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.28)', Icon: AlertTriangle },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.28)', Icon: Info },
}

export default function NotificationCenter() {
  const { alerts, connected, unreadCount, markAllRead } = useRealtime()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // 바깥 클릭 시 닫기 - 2026-08-02
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const toggle = () => {
    setOpen((v) => {
      if (!v) markAllRead() // 열 때 현재 알림을 읽음 처리
      return !v
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-1.5 rounded-lg text-secondary hover-text-primary hover-bg-elevated transition-colors cursor-pointer"
        title="알림"
        aria-label={`알림 ${unreadCount}건`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ background: '#ef4444', fontSize: '9px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-w-[90vw] bg-surface border border-theme rounded-lg shadow-lg z-50 overflow-hidden">
          {/* 헤더 — 연결 상태 표시 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-theme">
            <span className="text-sm font-semibold text-primary">실시간 알림</span>
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: connected ? '#34d399' : '#9ca3af' }}
              title={connected ? '실시간 연결됨' : '연결 끊김'}
            >
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? '실시간' : '연결 중'}
            </span>
          </div>

          {/* 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-xs text-muted text-center py-8">현재 알림이 없습니다.</p>
            ) : (
              alerts.map((a) => {
                const s = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.info
                const Icon = s.Icon
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 border-b border-theme last:border-b-0"
                    style={{ background: s.bg }}
                  >
                    <Icon size={15} style={{ color: s.color }} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: s.color }}>{a.title}</span>
                        <span className="text-xs text-muted">· {a.category}</span>
                      </div>
                      <p className="text-xs text-primary leading-snug mt-0.5 break-words">{a.message}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
