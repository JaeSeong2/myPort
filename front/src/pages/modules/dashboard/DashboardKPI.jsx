// 대시보드 KPI 패널 - 2026-06-04
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  ClipboardList, Factory, Package, ShieldCheck, Wrench,
  Sparkles, Loader2, TrendingUp, AlertTriangle, Lightbulb,
} from 'lucide-react'
import { API_BASE } from '../../../constants/api'

const AI_API   = `${API_BASE}/api/ai/insight`
const WO_API   = `${API_BASE}/api/work-orders`
const PROD_API = `${API_BASE}/api/productions`
const INV_API  = `${API_BASE}/api/inventory`
const QA_API   = `${API_BASE}/api/quality`
const EQ_API   = `${API_BASE}/api/equipment`

// 오늘 날짜 기준 캐시 키 — 날짜가 바뀌면 자동 초기화
const insightKey = () => `ai_insight_${new Date().toISOString().slice(0, 10)}`

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(insightKey())) ?? null }
  catch { return null }
}

const fmtDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const INSIGHT_SECTIONS = [
  { key: '성과', label: '핵심 성과', icon: TrendingUp,     color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)'  },
  { key: '주의', label: '주의 항목', icon: AlertTriangle,  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)'  },
  { key: '제안', label: '개선 제안', icon: Lightbulb,      color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)'  },
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

export default function DashboardKPI() {
  const [kpi,       setKpi]       = useState({ wo: 0, ongoing: 0, lowStock: 0, passRate: '—', eqRunning: 0, eqBreakdown: 0 })
  const [prodChart, setProdChart] = useState([])
  const [invChart,  setInvChart]  = useState([])
  const [loading,   setLoading]   = useState(true)

  // localStorage 캐시로 초기화 — 다른 화면 이동 후 복귀 시 유지
  const [_init]          = useState(readCache)
  const [aiInsight,      setAiInsight]      = useState(_init?.insight       ?? '')
  const [aiLoading,      setAiLoading]      = useState(false)
  const [aiError,        setAiError]        = useState('')
  const [tokenUsage,     setTokenUsage]     = useState(_init?.tokenUsage    ?? null)
  const [remainingCalls, setRemainingCalls] = useState(_init?.remainingCalls ?? null)
  const [generatedAt,    setGeneratedAt]    = useState(_init?.generatedAt   ?? '')

  // 자동 생성은 세션당 한 번만 — 캐시 있으면 스킵
  const autoGenFired = useRef(!!_init)

  const loadKpi = useCallback(async () => {
    setLoading(true)
    try {
      const now        = new Date()
      const monthStart = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1))
      const monthEnd   = fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))

      const [woRes, prodAllRes, invRes, qaRes, eqRes] = await Promise.all([
        fetch(`${WO_API}?start_date=${monthStart}&end_date=${monthEnd}`).then(r => r.json()),
        fetch(`${PROD_API}?start_date=${monthStart}&end_date=${monthEnd}`).then(r => r.json()),
        fetch(INV_API).then(r => r.json()),
        fetch(`${QA_API}?start_date=${monthStart}&end_date=${monthEnd}`).then(r => r.json()),
        fetch(EQ_API).then(r => r.json()),
      ])

      const wos    = woRes.data      ?? []
      const prods  = prodAllRes.data ?? []
      const stocks = invRes.data     ?? []
      const qas    = qaRes.data      ?? []
      const eqs    = eqRes.data      ?? []

      const ongoing     = prods.filter(p => p.status === 'ONGOING').length
      const lowStock    = stocks.filter(s => s.current_stock <= 0 || (s.safety_stock > 0 && s.current_stock < s.safety_stock)).length
      const passRate    = qas.length > 0
        ? `${(qas.reduce((s, q) => s + (q.pass_rate ?? 0), 0) / qas.length).toFixed(1)}%`
        : '—'
      const eqRunning   = eqs.filter(e => e.status === 'RUNNING').length
      const eqBreakdown = eqs.filter(e => e.status === 'BREAKDOWN').length

      setKpi({ wo: wos.length, ongoing, lowStock, passRate, eqRunning, eqBreakdown })

      const fourteenDaysAgo = fmtDate(new Date(now - 14 * 86400000))
      const recent = prods.filter(p => p.work_date >= fourteenDaysAgo && p.work_date <= monthEnd)
      const dailyMap = {}
      recent.forEach(p => {
        const d = (p.work_date ?? '').slice(5)
        if (!d) return
        if (!dailyMap[d]) dailyMap[d] = { date: d, actual: 0, defect: 0 }
        dailyMap[d].actual += p.actual_qty ?? 0
        dailyMap[d].defect += p.defect_qty ?? 0
      })
      setProdChart(Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)))

      const matStocks = stocks
        .filter(s => s.item_type === 'RAW' || s.item_type === 'CONSUMABLE')
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 10)
        .map(s => ({
          name:   s.item_name ?? s.item_code,
          stock:  s.current_stock,
          safety: s.safety_stock ?? 0,
          low:    s.current_stock <= 0 || (s.safety_stock > 0 && s.current_stock < s.safety_stock),
        }))
      setInvChart(matStocks)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKpi() }, [loadKpi])

  const requestInsight = useCallback(async () => {
    setAiLoading(true)
    setAiError('')
    setAiInsight('')
    setTokenUsage(null)
    setGeneratedAt('')
    try {
      const res  = await fetch(AI_API, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? '요청 실패')
      const now = new Date().toISOString()
      setAiInsight(data.insight)
      setTokenUsage(data.token_usage)
      setRemainingCalls(data.remaining_calls)
      setGeneratedAt(now)
      // 오늘 날짜 키로 저장 — 화면 전환·사용자 전환 후에도 유지
      localStorage.setItem(insightKey(), JSON.stringify({
        insight:        data.insight,
        tokenUsage:     data.token_usage,
        remainingCalls: data.remaining_calls,
        generatedAt:    now,
      }))
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }, [])

  // KPI 로드 완료 후 캐시 없으면 자동 생성
  useEffect(() => {
    if (loading || autoGenFired.current) return
    const hasData = kpi.wo > 0 || prodChart.length > 0
    if (hasData) {
      autoGenFired.current = true
      requestInsight()
    }
  }, [loading, kpi.wo, prodChart.length, requestInsight])

  const KPI_CARDS = [
    { icon: <ClipboardList size={20} />, label: '월 작업지시', value: kpi.wo,          unit: '건',   color: '#60a5fa' },
    { icon: <Factory size={20} />,       label: '진행중 생산', value: kpi.ongoing,     unit: '건',   color: '#34d399' },
    { icon: <Package size={20} />,       label: '재고 부족',   value: kpi.lowStock,    unit: '품목', color: '#f87171' },
    { icon: <ShieldCheck size={20} />,   label: '월 합격률',   value: kpi.passRate,    unit: '',     color: '#a78bfa' },
    { icon: <Wrench size={20} />,        label: '가동 설비',   value: kpi.eqRunning,   unit: '대',   color: '#4ade80' },
    { icon: <Wrench size={20} />,        label: '고장 설비',   value: kpi.eqBreakdown, unit: '대',   color: '#f87171' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
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
                <span className="text-3xl font-bold text-primary">{loading ? '—' : c.value}</span>
                {c.unit && <span className="text-sm text-muted">{c.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Chart */}
      <div className="bg-surface border border-theme rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-4">최근 생산 실적 (일별)</h3>
        {prodChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={prodChart} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}
                stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="actual" name="실적수량" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="defect" name="불량수량" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-44 flex items-center justify-center text-muted text-sm">
            {loading ? '로딩 중...' : '이번 달 생산 데이터가 없습니다'}
          </div>
        )}
      </div>

      {/* Inventory Chart */}
      <div className="bg-surface border border-theme rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-4">자재 재고 현황</h3>
        {invChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={invChart} layout="vertical"
              margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}
                stroke="rgba(128,128,128,0.15)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }}
                width={80} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="stock" name="현재고" fill="#34d399" radius={[0, 3, 3, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-44 flex items-center justify-center text-muted text-sm">
            {loading ? '로딩 중...' : '재고 데이터가 없습니다'}
          </div>
        )}
      </div>

      {/* AI 인사이트 */}
      <div className="bg-surface border border-theme rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-1.5">
            <Sparkles size={15} className="text-violet-400" />
            AI 생산 인사이트
            {generatedAt && (
              <span className="text-xs font-normal text-muted ml-1">
                · {fmtGeneratedAt(generatedAt)}
              </span>
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
              : <><Sparkles size={12} /> {aiInsight ? '재생성' : '인사이트 생성'}</>
            }
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
                    <div key={key} className="rounded-lg px-3 py-2.5"
                      style={{ background: bg, border: `1px solid ${border}` }}>
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
          // JSON 파싱 실패 시 plain text fallback
          return (
            <div className="text-sm text-primary leading-relaxed whitespace-pre-line mb-3">
              {aiInsight}
            </div>
          )
        })()}

        {!aiInsight && !aiError && !aiLoading && (
          <p className="text-xs text-muted text-center py-4">
            KPI 데이터 로딩 후 자동으로 분석됩니다
          </p>
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
    </div>
  )
}
