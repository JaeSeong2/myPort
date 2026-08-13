// 알림 센터 — TopBar 종 아이콘 + 미확인 배지 + 드롭다운(알림/새소식 2탭) - 2026-08-02
// 알림 탭: RealtimeContext SSE 실시간 알림 / 새소식 탭: CHANGELOG(버전별 변경사항) - 2026-08-07
import { useEffect, useRef, useState } from 'react'
import { Bell, AlertTriangle, AlertCircle, Info, Wifi, WifiOff, Sparkles } from 'lucide-react'
import { useRealtime } from '../../context/RealtimeContext'
import { useLanguage } from '../../context/LanguageContext'
import { CHANGELOG, APP_VERSION } from '../../data/changelog'

// 심각도별 색/아이콘 매핑 - 2026-08-02
const LEVEL_STYLE = {
  critical: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.28)', Icon: AlertCircle },
  warning:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.28)', Icon: AlertTriangle },
  info:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.28)', Icon: Info },
}

const SEEN_KEY = 'mes_news_seen_version' // 마지막으로 확인한 새소식 버전

export default function NotificationCenter() {
  const { alerts, connected, unreadCount, markAllRead } = useRealtime()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState('alerts') // 'alerts' | 'news'
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) } catch { return null }
  })
  const ref = useRef(null)

  // 새소식 미확인 — 마지막 본 버전이 현재 앱 버전과 다르면 새것 있음 - 2026-08-07
  const newsUnread = seen !== APP_VERSION
  const bellCount  = unreadCount + (newsUnread ? 1 : 0)

  // 바깥 클릭 시 닫기 - 2026-08-02
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // 탭을 확인하면 해당 탭을 읽음 처리 - 2026-08-07
  const markTabRead = (which) => {
    if (which === 'alerts') markAllRead()
    else {
      setSeen(APP_VERSION)
      try { localStorage.setItem(SEEN_KEY, APP_VERSION) } catch {}
    }
  }

  const toggle = () => {
    setOpen((v) => {
      if (!v) markTabRead(tab) // 열 때 현재 탭 읽음 처리
      return !v
    })
  }

  const switchTab = (which) => {
    setTab(which)
    if (open) markTabRead(which)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-1.5 rounded-lg text-secondary hover-text-primary hover-bg-elevated transition-colors cursor-pointer"
        title={t('noti.tabAlerts')}
        aria-label={`${t('noti.tabAlerts')} ${bellCount}`}
      >
        <Bell size={17} />
        {bellCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ background: '#ef4444', fontSize: '9px' }}
          >
            {bellCount > 9 ? '9+' : bellCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-w-[90vw] bg-surface border border-theme rounded-lg shadow-lg z-50 overflow-hidden">
          {/* 탭 헤더 + 연결 상태 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-theme">
            <div className="flex items-center gap-1">
              <TabButton label={t('noti.tabAlerts')} active={tab === 'alerts'} dot={unreadCount > 0} onClick={() => switchTab('alerts')} />
              <TabButton label={t('noti.tabNews')}   active={tab === 'news'}   dot={newsUnread}       onClick={() => switchTab('news')} />
            </div>
            {tab === 'alerts' && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: connected ? '#34d399' : '#9ca3af' }}
                title={connected ? t('noti.live') : t('noti.connecting')}
              >
                {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {connected ? t('noti.live') : t('noti.connecting')}
              </span>
            )}
          </div>

          {/* 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {tab === 'alerts' ? (
              alerts.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">{t('noti.noAlerts')}</p>
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
              )
            ) : (
              // 새소식 — 버전별 변경사항 - 2026-08-07
              CHANGELOG.map((rel, idx) => (
                <div key={rel.version} className="px-3 py-2.5 border-b border-theme last:border-b-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={13} style={{ color: 'var(--accent)' }} className="shrink-0" />
                    <span className="text-xs font-semibold text-primary">v{rel.version}</span>
                    {idx === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>{t('noti.latest')}</span>
                    )}
                    <span className="ml-auto text-[11px] text-muted">{rel.date}</span>
                  </div>
                  <ul className="flex flex-col gap-0.5 pl-1">
                    {rel.items.map((it, i) => (
                      <li key={i} className="text-xs text-primary leading-snug flex gap-1.5">
                        <span className="text-muted shrink-0">·</span>
                        <span className="break-words">{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 탭 버튼 — 미확인 시 점(dot) 표시 - 2026-08-07
function TabButton({ label, active, dot, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
        active ? 'bg-accent-subtle text-accent' : 'text-muted hover-text-primary'
      }`}
    >
      {label}
      {dot && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />
      )}
    </button>
  )
}
