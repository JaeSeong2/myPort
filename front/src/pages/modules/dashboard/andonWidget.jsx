// 실시간 Andon 위젯 — 설비/라인 가동 현황을 SSE로 실시간 표시 - 2026-08-02
// RealtimeContext의 단일 스트림을 구독하여 8초 주기로 자동 갱신된다.
// 아이소메트릭 라인맵(2.5D) — 라인(eq_type)별 설비를 입체 블록으로 배치 - 2026-08-18
import { useState } from 'react'
import { Activity, Boxes, LayoutGrid } from 'lucide-react'
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

// eq_type → 라인 그룹. 정의된 순서로 표시, 그 외 타입은 OTHER로 묶음 - 2026-08-18
const LINE_ORDER = ['PRODUCTION', 'INSPECTION', 'UTILITY', 'SAFETY']

// 아이소메트릭 설비 블록(2.5D 큐보이드) — 상단/좌/우 3면 + 가동·고장 글로우 - 2026-08-18
// SVG 폴리곤으로 그려 테마·해상도에 안전하고, 라벨은 블록 아래 정방향 유지.
function IsoMachine({ eq, t }) {
  const s = STATUS_STYLE[eq.status] ?? STATUS_STYLE.IDLE
  const glow = eq.status === 'RUNNING' || eq.status === 'BREAKDOWN'
  const shortCode = eq.code.replace(/^EQ-/, '')
  return (
    <div
      className="flex flex-col items-center gap-0.5 shrink-0 w-14"
      title={`${eq.code} · ${eq.name}${eq.location ? ` · ${eq.location}` : ''}`}
    >
      <div className="relative" style={{ opacity: eq.status === 'IDLE' ? 0.7 : 1 }}>
        <svg
          width="52" height="54" viewBox="0 0 60 62"
          style={{
            display: 'block',
            filter: `drop-shadow(0 3px 2px rgba(0,0,0,0.22))${glow ? ` drop-shadow(0 0 5px ${s.dot})` : ''}`,
          }}
        >
          {/* 우측면(가장 어둡게) */}
          <polygon points="57,18 30,33 30,57 57,42" fill={s.dot} />
          <polygon points="57,18 30,33 30,57 57,42" fill="#000" opacity="0.34" />
          {/* 좌측면(중간) */}
          <polygon points="3,18 30,33 30,57 3,42" fill={s.dot} />
          <polygon points="3,18 30,33 30,57 3,42" fill="#000" opacity="0.16" />
          {/* 상단면(가장 밝게) */}
          <polygon points="30,3 57,18 30,33 3,18" fill={s.dot} />
          <polygon points="30,3 57,18 30,33 3,18" fill="#fff" opacity="0.13" />
        </svg>
        {/* 가동 중 LED — 깜빡임 */}
        {eq.status === 'RUNNING' && (
          <span
            className="absolute top-1 right-2.5 w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#fff', boxShadow: `0 0 5px ${s.dot}` }}
          />
        )}
      </div>
      <span className="text-[10px] font-semibold text-primary leading-none truncate max-w-full">{shortCode}</span>
      <span className="text-[9px] leading-none" style={{ color: s.text }}>{t(`andon.st.${eq.status}`)}</span>
    </div>
  )
}

// 한 라인(설비 흐름) 행 — 라벨 + 설비 블록을 컨베이어처럼 좌→우 배치 - 2026-08-18
function IsoLine({ lineKey, machines, t }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-primary shrink-0">{t(`andon.line.${lineKey}`)}</span>
        <span className="text-[10px] text-muted shrink-0">×{machines.length}</span>
        <div className="flex-1 border-t border-theme" />
      </div>
      <div className="flex items-end gap-0.5 overflow-x-auto pb-1">
        {machines.map((eq, i) => (
          <div key={eq.code} className="flex items-end shrink-0">
            <IsoMachine eq={eq} t={t} />
            {i < machines.length - 1 && (
              <span className="text-muted text-xs mb-5 shrink-0 select-none">›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AndonContent() {
  const { andon, connected } = useRealtime()
  const { t } = useLanguage()
  const [view, setView] = useState('map') // map(아이소메트릭) | tile(기존 그리드) - 2026-08-18
  const summary = andon?.summary ?? {}
  const lines   = andon?.lines ?? []

  // eq_type 기준 라인 그룹핑(정의 순서 우선, 나머지는 OTHER) - 2026-08-18
  const grouped = LINE_ORDER
    .map((k) => [k, lines.filter((e) => e.eq_type === k)])
    .filter(([, m]) => m.length > 0)
  const others = lines.filter((e) => !LINE_ORDER.includes(e.eq_type))
  if (others.length) grouped.push(['OTHER', others])

  return (
    <div className="bg-surface border border-theme rounded-xl p-4 flex flex-col h-full">
      {/* 헤더 — 뷰 토글 + 실시간 표시등 */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
          <Activity size={15} className="text-emerald-400" />
          {t('andon.title')}
        </h3>
        <div className="ml-auto flex items-center gap-1 rounded-md border border-theme p-0.5">
          <button
            onClick={() => setView('map')}
            title={t('andon.view.map')}
            className={`p-1 rounded cursor-pointer transition-colors ${view === 'map' ? 'bg-elevated text-primary' : 'text-muted hover-text-primary'}`}
          >
            <Boxes size={13} />
          </button>
          <button
            onClick={() => setView('tile')}
            title={t('andon.view.tile')}
            className={`p-1 rounded cursor-pointer transition-colors ${view === 'tile' ? 'bg-elevated text-primary' : 'text-muted hover-text-primary'}`}
          >
            <LayoutGrid size={13} />
          </button>
        </div>
        <span className="flex items-center gap-1.5 text-xs shrink-0" style={{ color: connected ? '#34d399' : '#9ca3af' }}>
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

      {/* 본문 — 라인맵(아이소메트릭) 또는 타일 그리드 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            {connected ? t('andon.noEq') : t('andon.loadingData')}
          </div>
        ) : view === 'map' ? (
          <div className="pt-1">
            {grouped.map(([lineKey, machines]) => (
              <IsoLine key={lineKey} lineKey={lineKey} machines={machines} t={t} />
            ))}
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
