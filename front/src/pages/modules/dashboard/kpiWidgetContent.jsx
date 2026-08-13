// KPI 위젯 렌더링 내용 빌더 — 데이터(useKpiData)를 받아 위젯 노드 생성 - 2026-07-25
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  ClipboardList, Factory, Package, ShieldCheck, Wrench,
  Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb,
} from 'lucide-react'

// 언어 중립 JSON 키(highlight/caution/suggestion) + 라벨은 t()로 - 2026-08-13
const INSIGHT_SECTIONS = [
  { key: 'highlight',  labelKey: 'ai.highlight',  icon: TrendingUp,    color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
  { key: 'caution',    labelKey: 'ai.caution',    icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
  { key: 'suggestion', labelKey: 'ai.suggestion', icon: Lightbulb,     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
]

// JSON 형식이면 섹션 객체 반환, 아니면 null (언어 중립 키 기준) - 2026-08-13
const parseInsight = (text) => {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    if (parsed.highlight || parsed.caution || parsed.suggestion) return parsed
  } catch {}
  return null
}

const fmtGeneratedAt = (iso, t) => {
  if (!iso) return ''
  const d = new Date(iso)
  const base = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${base} ${t('ai.generatedSuffix')}`.trim()
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
export function buildKpiContent(d, t) {
  const {
    loading, kpi, prodChart, invChart,
    aiInsight, aiLoading, aiError, tokenUsage, remainingCalls, generatedAt, requestInsight,
  } = d

  const KPI_CARDS = [
    { icon: <ClipboardList size={20} />, label: t('dash.kpi.wo'),          value: kpi.wo,          unit: t('dash.unit.cases'),    color: '#60a5fa' },
    { icon: <Factory size={20} />,       label: t('dash.kpi.ongoing'),     value: kpi.ongoing,     unit: t('dash.unit.cases'),    color: '#34d399' },
    { icon: <Package size={20} />,       label: t('dash.kpi.lowStock'),    value: kpi.lowStock,    unit: t('dash.unit.items'),    color: '#f87171' },
    { icon: <ShieldCheck size={20} />,   label: t('dash.kpi.passRate'),    value: kpi.passRate,    unit: '',                      color: '#a78bfa' },
    { icon: <Wrench size={20} />,        label: t('dash.kpi.eqRunning'),   value: kpi.eqRunning,   unit: t('dash.unit.machines'), color: '#4ade80' },
    { icon: <Wrench size={20} />,        label: t('dash.kpi.eqBreakdown'), value: kpi.eqBreakdown, unit: t('dash.unit.machines'), color: '#f87171' },
  ]

  return {
    kpi: (
      <div>
        <h2 className="text-primary text-lg font-semibold mb-3">{t('dash.kpiTitle')}</h2>
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
        <h3 className="text-sm font-semibold text-primary mb-4 shrink-0">{t('dash.prodTitle')}</h3>
        <div className="flex-1 min-h-0">
          {prodChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodChart} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="actual" name={t('dash.series.actual')} fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="defect" name={t('dash.series.defect')} fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-sm">
              {loading ? t('msg.loading') : t('dash.noProd')}
            </div>
          )}
        </div>
      </div>
    ),
    inv: (
      <div className="bg-surface border border-theme rounded-xl p-4 flex flex-col">
        <h3 className="text-sm font-semibold text-primary mb-4 shrink-0">{t('dash.invTitle')}</h3>
        <div className="flex-1 min-h-0">
          {invChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invChart} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }}
                  width={80} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="stock" name={t('dash.series.stock')} fill="#34d399" radius={[0, 3, 3, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted text-sm">
              {loading ? t('msg.loading') : t('dash.noInv')}
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
            {t('ai.title')}
            {generatedAt && (
              <span className="text-xs font-normal text-muted ml-1">· {fmtGeneratedAt(generatedAt, t)}</span>
            )}
          </h3>
          <button
            onClick={requestInsight}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
          >
            {aiLoading
              ? <><Loader2 size={12} className="animate-spin" /> {t('ai.analyzing')}</>
              : <><Sparkles size={12} /> {aiInsight ? t('ai.regen') : t('ai.generate')}</>}
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
                {INSIGHT_SECTIONS.map(({ key, labelKey, icon: Icon, color, bg, border }) =>
                  sections[key] ? (
                    <div key={key} className="rounded-lg px-3 py-2.5" style={{ background: bg, border: `1px solid ${border}` }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={12} style={{ color }} />
                        <span className="text-xs font-semibold" style={{ color }}>{t(labelKey)}</span>
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
          <p className="text-xs text-muted text-center py-4">{t('ai.autoHint')}</p>
        )}

        {aiLoading && !aiInsight && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted">
            <Loader2 size={14} className="animate-spin text-violet-400" />
            {t('ai.analyzingLong')}
          </div>
        )}

        {tokenUsage && (
          <div className="flex items-center gap-3 pt-2 border-t border-theme mt-2">
            <span className="text-xs text-muted">{t('ai.tokenUsage')}</span>
            <span className="text-xs" style={{ color: '#60a5fa' }}>{t('ai.tokenIn')} {tokenUsage.prompt_tokens}</span>
            <span className="text-xs" style={{ color: '#34d399' }}>{t('ai.tokenOut')} {tokenUsage.completion_tokens}</span>
            <span className="text-xs text-muted">{t('ai.tokenTotal')} {tokenUsage.total_tokens}</span>
            {remainingCalls !== null && (
              <span className="text-xs text-muted ml-auto">{t('ai.remaining').replace('{n}', remainingCalls)}</span>
            )}
          </div>
        )}
      </div>
    ),
  }
}
