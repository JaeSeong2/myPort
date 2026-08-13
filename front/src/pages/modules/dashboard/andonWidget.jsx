// 실시간 Andon 위젯 — 설비/라인 가동 현황을 SSE로 실시간 표시 - 2026-08-02
// RealtimeContext의 단일 스트림을 구독하여 8초 주기로 자동 갱신된다.
import { Activity } from 'lucide-react'
import { useRealtime } from '../../../context/RealtimeContext'
import { useLanguage } from '../../../context/LanguageContext'

// 설비 상태별 색상(가동=녹색, 대기=회색, 정비=주황, 고장=빨강) - 2026-08-02
const STATUS_STYLE = {
  RUNNING:     { dot: '#34d399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.30)',  text: '#34d399' },
  IDLE:        { dot: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.22)', text: '#9ca3af' },
  MAINTENANCE: { dot: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.30)',  text: '#fbbf24' },
  BREAKDOWN:   { dot: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', text: '#f87171' },
}

const SUMMARY_ITEMS = [
  { key: 'RUNNING' },
  { key: 'IDLE' },
  { key: 'MAINTENANCE' },
  { key: 'BREAKDOWN' },
]

export function AndonContent() {
  const { andon, connected } = useRealtime()
  const { t } = useLanguage()
  const summary = andon?.summary ?? {}
  const lines   = andon?.lines ?? []

  return (
    <div className="bg-surface border border-theme rounded-xl p-4 flex flex-col h-full">
      {/* 헤더 — 실시간 표시등 */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
          <Activity size={15} className="text-emerald-400" />
          {t('andon.title')}
        </h3>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: connected ? '#34d399' : '#9ca3af' }}>
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'animate-pulse' : ''}`}
            style={{ background: connected ? '#34d399' : '#9ca3af' }}
          />
          {connected ? t('andon.live') : t('andon.connecting')}
        </span>
      </div>

      {/* 상태 요약 */}
      <div className="grid grid-cols-4 gap-2 mb-3 shrink-0">
        {SUMMARY_ITEMS.map(({ key }) => {
          const s = STATUS_STYLE[key]
          return (
            <div key={key} className="rounded-lg px-2 py-2 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div className="text-lg font-bold" style={{ color: s.text }}>{summary[key] ?? 0}</div>
              <div className="text-xs text-muted">{t(`andon.st.${key}`)}</div>
            </div>
          )
        })}
      </div>

      {/* 설비 타일 그리드 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            {connected ? t('andon.noEq') : t('andon.loadingData')}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {lines.map((eq) => {
              const s = STATUS_STYLE[eq.status] ?? STATUS_STYLE.IDLE
              return (
                <div
                  key={eq.code}
                  className="rounded-lg px-2.5 py-2 flex flex-col gap-1"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                  title={`${eq.name}${eq.location ? ` · ${eq.location}` : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${eq.status === 'RUNNING' ? 'animate-pulse' : ''}`}
                      style={{ background: s.dot }}
                    />
                    <span className="text-xs font-medium text-primary truncate">{eq.code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted truncate">{eq.name}</span>
                    <span className="text-xs font-semibold shrink-0" style={{ color: s.text }}>{t(`andon.st.${eq.status}`)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
