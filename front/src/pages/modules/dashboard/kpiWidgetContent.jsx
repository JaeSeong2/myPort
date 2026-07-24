// KPI 위젯 렌더링 내용 빌더 — 데이터(useKpiData)를 받아 위젯 노드 생성 - 2026-07-25
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  ClipboardList, Factory, Package, ShieldCheck, Wrench,
  Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb,
} from 'lucide-react'

const INSIGHT_SECTIONS = [
  { key: '성과', label: '핵심 성과', icon: TrendingUp,     color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
  { key: '주의', label: '주의 항목', icon: AlertTriangle,  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
  { key: '제안', label: '개선 제안', icon: Lightbulb,      color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
]

// JSON 형식이면 섹션 객체 반환, 아니면 null
const parseInsight = (text) => {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    if (parsed.성과 || parsed.주의 || parsed.제안) return parsed
  } catch {}
  return null
}

const fmtGeneratedAt = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} 생성`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-theme rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

/**
 * @param {object} d useKpiData() 반환값
 * @returns {{ kpi:node, prod:node, inv:node, ai:node }}
 * 차트 위젯은 컨테이너 높이를 꽉 채움(리사이즈 핸들로 높이 조절) - 2026-07-25
 */
export function buildKpiContent(d) {
  const {
    loading, kpi, prodChart, invChart,
    aiInsight, aiLoading, aiError, tokenUsage, remainingCalls, generatedAt, requestInsight,
  } = d

  const KPI_CARDS = [
    { icon: <ClipboardList size={20} />, label: '월 작업지시', value: kpi.wo,          unit: '건',   color: '#60a5fa' },
    { icon: <Factory size={20} />,       label: '진행중 생산', value: kpi.ongoing,     unit: '건',   color: '#34d399' },
    { icon: <Package size={20} />,       label: '재고 부족',   value: kpi.lowStock,    unit: '품목', color: '#f87171' },
    { icon: <ShieldCheck size={20} />,   label: '월 합격률',   value: kpi.passRate,    unit: '',     color: '#a78bfa' },
    { icon: <Wrench size={20} />,        label: '가동 설비',   value: kpi.eqRunning,   unit: '대',   color: '#4ade80' },
    { icon: <Wrench size={20} />,        label: '고장 설비',   value: kpi.eqBreakdown, unit: '대',   color: '#f87171' },
  ]

  return {
    kpi: (
      <div>
        <h2 className="text-primary text-lg font-semibold mb-3">월간 KPI 현황</h2>
        <div className="grid grid-cols-3 gap-3">
          {KPI_CARDS.map((c, i) => (
            <div key={i} className="bg-surface border border-theme rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted">{c.label}</span>
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary">{loading ? '—' : c.value}</span>
                {c.unit && <span className="text-sm text-muted">{c.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    prod: (
      <div className="bg-surface border border-theme rounded-xl p-4 flex flex-col">
        <h3 className="text-sm font-semibold text-primary mb-4 shrink-0">최근 생산 실적 (일별)</h3>
        <div className="flex-1 min-h-0">
          {prodChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodChart} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="actual" name="실적수량" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="defect" name="불량수량" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-sm">
              {loading ? '로딩 중...' : '이번 달 생산 데이터가 없습니다'}
            </div>
          )}
        </div>
      </div>
    ),
    inv: (
      <div className="bg-surface border border-theme rounded-xl p-4 flex flex-col">
        <h3 className="text-sm font-semibold text-primary mb-4 shrink-0">자재 재고 현황</h3>
        <div className="flex-1 min-h-0">
          {invChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invChart} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }}
                  width={80} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="stock" name="현재고" fill="#34d399" radius={[0, 3, 3, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-sm">
              {loading ? '로딩 중...' : '재고 데이터가 없습니다'}
            </div>
          )}
        </div>
      </div>
    ),
    ai: (
      <div className="bg-surface border border-theme rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <Sparkles size={15} className="text-violet-400" />
            AI 생산 인사이트
            {generatedAt && (
              <span className="text-xs font-normal text-muted ml-1">· {fmtGeneratedAt(generatedAt)}</span>
            )}
          </h3>
          <button
            onClick={requestInsight}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
          >
            {aiLoading
              ? <><Loader2 size={12} className="animate-spin" /> 분석 중...</>
              : <><Sparkles size={12} /> {aiInsight ? '재생성' : '인사이트 생성'}</>}
          </button>
        </div>

        {aiError && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{aiError}</p>
        )}

        {aiInsight && (() => {
          const sections = parseInsight(aiInsight)
          if (sections) {
            return (
              <div className="flex flex-col gap-2 mb-3">
                {INSIGHT_SECTIONS.map(({ key, label, icon: Icon, color, bg, border }) =>
                  sections[key] ? (
                    <div key={key} className="rounded-lg px-3 py-2.5" style={{ background: bg, border: `1px solid ${border}` }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={12} style={{ color }} />
                        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                      </div>
                      <p className="text-xs text-primary leading-relaxed">{sections[key]}</p>
                    </div>
                  ) : null
                )}
              </div>
            )
          }
          return (
            <div className="text-sm text-primary leading-relaxed whitespace-pre-line mb-3">{aiInsight}</div>
          )
        })()}

        {!aiInsight && !aiError && !aiLoading && (
          <p className="text-xs text-muted text-center py-4">KPI 데이터 로딩 후 자동으로 분석됩니다</p>
        )}

        {aiLoading && !aiInsight && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted">
            <Loader2 size={14} className="animate-spin text-violet-400" />
            이번 달 KPI를 분석하고 있습니다...
          </div>
        )}

        {tokenUsage && (
          <div className="flex items-center gap-3 pt-2 border-t border-theme mt-2">
            <span className="text-xs text-muted">토큰 사용량</span>
            <span className="text-xs" style={{ color: '#60a5fa' }}>입력 {tokenUsage.prompt_tokens}</span>
            <span className="text-xs" style={{ color: '#34d399' }}>출력 {tokenUsage.completion_tokens}</span>
            <span className="text-xs text-muted">합계 {tokenUsage.total_tokens}</span>
            {remainingCalls !== null && (
              <span className="text-xs text-muted ml-auto">오늘 잔여 {remainingCalls}회</span>
            )}
          </div>
        )}
      </div>
    ),
  }
}
