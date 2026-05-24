// 대시보드 - 2026-05-24
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Factory, ClipboardList, Package, ShieldCheck,
  Code2, Database, Layers, GitBranch, Wrench, GitMerge,
} from 'lucide-react'
import { API_BASE } from '../../../constants/api'

const WO_API   = `${API_BASE}/api/work-orders`
const PROD_API = `${API_BASE}/api/productions`
const INV_API  = `${API_BASE}/api/inventory`
const QA_API   = `${API_BASE}/api/quality`
const EQ_API   = `${API_BASE}/api/equipment`

const fmtDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TECH_STACK = [
  { icon: <Code2 size={13} />,    label: 'React 19',         color: '#60a5fa' },
  { icon: <Code2 size={13} />,    label: 'Vite 6',           color: '#a78bfa' },
  { icon: <Layers size={13} />,   label: 'FastAPI',          color: '#34d399' },
  { icon: <Database size={13} />, label: 'MongoDB Atlas',    color: '#4ade80' },
  { icon: <GitBranch size={13} />,label: 'Motor (async)',    color: '#818cf8' },
  { icon: <Code2 size={13} />,    label: 'Tailwind CSS',     color: '#38bdf8' },
  { icon: <Code2 size={13} />,    label: 'Recharts',         color: '#fb923c' },
]

const FEATURES = [
  { icon: <ClipboardList size={15} />, label: '작업지시 관리', desc: '작업지시 등록·배정·이력 추적' },
  { icon: <Factory size={15} />,       label: '생산 실적',     desc: 'MES 백플러시 자동 재고 반영' },
  { icon: <Package size={15} />,       label: '재고/자재',     desc: '입출고·재고 현황 실시간 조회' },
  { icon: <ShieldCheck size={15} />,   label: '품질 검사',     desc: '수입·공정·최종 검사 결과 관리' },
  { icon: <Layers size={15} />,        label: 'BOM 관리',      desc: '제품별 자재 소요량 정의' },
  { icon: <Wrench size={15} />,        label: '설비 현황',     desc: '설비 상태 모니터링 및 유형별 관리' },
  { icon: <GitMerge size={15} />,      label: '공정 흐름',     desc: '제품별 공정 순서·사이클타임 정의' },
  { icon: <ClipboardList size={15} />, label: '실적 보고',     desc: '일/월별 생산 실적 차트 분석' },
]

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

export default function DashboardPage() {
  const [kpi,       setKpi]       = useState({ wo: 0, ongoing: 0, lowStock: 0, passRate: '—', eqRunning: 0, eqBreakdown: 0 })
  const [prodChart, setProdChart] = useState([])
  const [invChart,  setInvChart]  = useState([])
  const [loading,   setLoading]   = useState(true)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const now   = new Date()
      const today = fmtDate(now)
      const monthStart = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1))

      const [woRes, prodAllRes, invRes, qaRes, eqRes] = await Promise.all([
        fetch(`${WO_API}?start_date=${monthStart}&end_date=${today}`).then(r => r.json()),
        fetch(`${PROD_API}?start_date=${monthStart}&end_date=${today}`).then(r => r.json()),
        fetch(INV_API).then(r => r.json()),
        fetch(`${QA_API}?start_date=${monthStart}&end_date=${today}`).then(r => r.json()),
        fetch(EQ_API).then(r => r.json()),
      ])

      const wos    = woRes.data   ?? []
      const prods  = prodAllRes.data ?? []
      const stocks = invRes.data  ?? []
      const qas    = qaRes.data   ?? []
      const eqs    = eqRes.data   ?? []

      const ongoing     = prods.filter(p => p.status === 'ONGOING').length
      const lowStock    = stocks.filter(s => s.current_stock <= 0 || (s.safety_stock > 0 && s.current_stock < s.safety_stock)).length
      const passRate    = qas.length > 0
        ? `${(qas.reduce((s, q) => s + (q.pass_rate ?? 0), 0) / qas.length).toFixed(1)}%`
        : '—'
      const eqRunning   = eqs.filter(e => e.status === 'RUNNING').length
      const eqBreakdown = eqs.filter(e => e.status === 'BREAKDOWN').length

      setKpi({ wo: wos.length, ongoing, lowStock, passRate, eqRunning, eqBreakdown })

      // Daily production chart (last 14 days)
      const fourteenDaysAgo = fmtDate(new Date(now - 14 * 86400000))
      const recent = prods.filter(p => p.work_date >= fourteenDaysAgo && p.work_date <= today)
      const dailyMap = {}
      recent.forEach(p => {
        const d = (p.work_date ?? '').slice(5)
        if (!d) return
        if (!dailyMap[d]) dailyMap[d] = { date: d, actual: 0, defect: 0 }
        dailyMap[d].actual += p.actual_qty  ?? 0
        dailyMap[d].defect += p.defect_qty  ?? 0
      })
      setProdChart(Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)))

      // Inventory chart: top 10 by current_stock (materials only)
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

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const KPI_CARDS = [
    { icon: <ClipboardList size={20} />, label: '월 작업지시',  value: kpi.wo,          unit: '건',  color: '#60a5fa' },
    { icon: <Factory size={20} />,       label: '진행중 생산',  value: kpi.ongoing,     unit: '건',  color: '#34d399' },
    { icon: <Package size={20} />,       label: '재고 부족',    value: kpi.lowStock,    unit: '품목', color: '#f87171' },
    { icon: <ShieldCheck size={20} />,   label: '월 합격률',    value: kpi.passRate,    unit: '',    color: '#a78bfa' },
    { icon: <Wrench size={20} />,        label: '가동 설비',    value: kpi.eqRunning,   unit: '대',  color: '#4ade80' },
    { icon: <Wrench size={20} />,        label: '고장 설비',    value: kpi.eqBreakdown, unit: '대',  color: '#f87171' },
  ]

  return (
    <div className="h-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      {/* ── Left: Portfolio ── */}
      <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-theme overflow-y-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
            <Factory size={12} />
            Manufacturing Execution System
          </div>
          <h1 className="text-primary text-2xl font-bold mb-2"> MES<br /></h1>
          <p className="text-muted text-sm leading-relaxed">
            자동차부품 제조 공정의 작업지시부터 생산·재고·품질까지<br />
            통합 관리하는 MES 풀스택 포트폴리오 프로젝트입니다.
          </p>
        </div>

        {/* Tech Stack */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((t, i) => (
              <span key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                style={{ color: t.color, borderColor: `${t.color}40`, background: `${t.color}12` }}>
                {t.icon}
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">주요 기능</h3>
          <div className="grid grid-cols-2 gap-2">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-surface border border-theme rounded-lg p-3 flex gap-2.5">
                <span className="text-muted mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <div className="text-sm font-medium text-primary">{f.label}</div>
                  <div className="text-xs text-muted mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Overview */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">데이터 구성</h3>
          <div className="bg-surface border border-theme rounded-lg p-4 text-xs text-muted leading-6">
            <div className="grid grid-cols-2 gap-x-4">
              <div>• 품목 15종 (완제품 5 · 반제품 2 · 원자재 5 · 소모품 3)</div>
              <div>• 작업지시 20건 (완료 8 · 진행 5 · 대기 5 · 중단 2)</div>
              <div>• 생산실적 13건 (완료 8 · 진행 5)</div>
              <div>• 재고거래 20건 (입고 10 · 출고 10)</div>
              <div>• BOM 등록 (완제품/반제품별 자재구성)</div>
              <div>• 품질검사 15건 (수입·공정·최종)</div>
              <div>• 설비 15종 (생산·유틸리티·안전·검사)</div>
              <div>• 공정흐름 31단계 (7개 제품별 정의)</div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="flex items-center gap-3 pt-4 border-t border-theme">
          <span className="text-xs text-muted">|</span>
          <span className="text-xs text-muted">React 19 + FastAPI + MongoDB Atlas</span>
        </div>
      </div>

      {/* ── Right: KPI + Charts ── */}
      <div className="w-full md:w-1/2 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
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
      </div>
    </div>
  )
}
