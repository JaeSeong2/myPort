// 대시보드 KPI 패널 - 2026-05-30
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  ClipboardList, Factory, Package, ShieldCheck, Wrench,
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
    </div>
  )
}
