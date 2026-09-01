// 생산 실적 보고 - 2026-05-23
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLanguage } from '../../../context/LanguageContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Table from '../../../components/containers/Table'
import { PageTitle } from '../../../components/common/FormControls'
import { effectiveMonthRange } from '../../../utils/effectiveMonth'
import { API_BASE } from '../../../constants/api'

const API = `${API_BASE}/api/productions`

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

export default function ReportPage() {
  const { t }   = useLanguage()
  const now     = new Date()
  const [year,    setYear]    = useState(now.getFullYear())
  const [month,   setMonth]   = useState(now.getMonth() + 1)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const mm       = String(month).padStart(2, '0')
    const lastDay  = new Date(year, month, 0).getDate()
    const start    = `${year}-${mm}-01`
    const end      = `${year}-${mm}-${lastDay}`
    try {
      const res  = await fetch(`${API}?start_date=${start}&end_date=${end}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } catch { setRows([]) }
    finally  { setLoading(false) }
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  // 최초 진입: 데이터 있는 최신월로 기본 년/월 지정(월 이월 — 대시보드와 통일) - 2026-09-01
  useEffect(() => {
    (async () => {
      try {
        const json = await fetch(API).then((r) => r.json())
        const { year: y, month: m } = effectiveMonthRange(json.data ?? [], 'work_date')
        setYear(y)
        setMonth(m + 1)  // effectiveMonthRange의 month는 0-based
      } catch { /* 현재월 유지 */ }
    })()
  }, [])

  // ── Summary ──────────────────────────────────────────────
  const summary = useMemo(() => {
    const planned = rows.reduce((s, r) => s + (r.planned_qty ?? 0), 0)
    const actual  = rows.reduce((s, r) => s + (r.actual_qty  ?? 0), 0)
    const defect  = rows.reduce((s, r) => s + (r.defect_qty  ?? 0), 0)
    return {
      planned,
      actual,
      defect,
      achieveRate: planned > 0 ? ((actual  / planned) * 100).toFixed(1) : '0.0',
      defectRate:  actual  > 0 ? ((defect  / actual)  * 100).toFixed(1) : '0.0',
    }
  }, [rows])

  // ── Daily chart ──────────────────────────────────────────
  const dailyData = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      if (!r.work_date) return
      const d = r.work_date.slice(5)
      if (!map[d]) map[d] = { date: d, actual: 0, defect: 0 }
      map[d].actual += r.actual_qty ?? 0
      map[d].defect += r.defect_qty ?? 0
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [rows])

  // ── By product ───────────────────────────────────────────
  const byProduct = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      const k = r.product_code
      if (!map[k]) map[k] = { product_code: k, product_name: r.product_name, planned: 0, actual: 0, defect: 0, count: 0 }
      map[k].planned += r.planned_qty ?? 0
      map[k].actual  += r.actual_qty  ?? 0
      map[k].defect  += r.defect_qty  ?? 0
      map[k].count++
    })
    return Object.values(map).sort((a, b) => b.actual - a.actual)
  }, [rows])

  const prodColumns = useMemo(() => [
    { key: 'product_code', label: t('report.productCode'), width: 110 },
    { key: 'product_name', label: t('report.productName') },
    { key: 'count',        label: t('report.count'),       width: 70  },
    { key: 'planned',      label: t('report.planned'),     width: 90,
      render: (r) => r.planned.toLocaleString() },
    { key: 'actual',       label: t('report.actual'),      width: 90,
      render: (r) => r.actual.toLocaleString() },
    { key: 'defect',       label: t('report.defect'),      width: 80,
      render: (r) => r.defect },
    { key: 'achieve',      label: t('report.achieve'),     width: 80,
      render: (r) => <span className={r.planned > 0 && r.actual / r.planned >= 0.95 ? 'text-success font-medium' : 'text-primary'}>
        {r.planned > 0 ? `${((r.actual / r.planned) * 100).toFixed(1)}%` : '-'}
      </span> },
    { key: 'defectRate',   label: t('report.defectRate'),  width: 80,
      render: (r) => <span className={r.actual > 0 && r.defect / r.actual > 0.05 ? 'text-danger' : 'text-primary'}>
        {r.actual > 0 ? `${((r.defect / r.actual) * 100).toFixed(1)}%` : '-'}
      </span> },
  ], [t])

  const years  = [now.getFullYear() - 1, now.getFullYear()]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="h-full overflow-y-auto p-6 flex flex-col gap-5">
      {/* Header + Filter */}
      <PageTitle title={t('report.title')} />
      <div className="flex gap-2 items-center shrink-0">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary cursor-pointer">
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary cursor-pointer">
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>
        <button onClick={loadData}
          className="px-4 py-1.5 rounded-md text-sm bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer">
          {t('btn.search')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        {[
          { label: t('report.totalPlanned'), value: summary.planned.toLocaleString(), unit: '건', hi: false },
          { label: t('report.totalActual'),  value: summary.actual.toLocaleString(),  unit: '건', hi: false },
          { label: t('report.achieveRate'),  value: `${summary.achieveRate}%`, unit: '',
            hi: Number(summary.achieveRate) >= 95, color: 'var(--success)' },
          { label: t('report.defectRate'),   value: `${summary.defectRate}%`,  unit: '',
            hi: Number(summary.defectRate)  >  5,  color: 'var(--danger)' },
        ].map((c, i) => (
          <div key={i} className="bg-surface border border-theme rounded-xl p-4">
            <p className="text-xs text-muted mb-1">{c.label}</p>
            <p className="text-2xl font-bold" style={{ color: c.hi ? c.color : 'var(--text-primary)' }}>
              {c.value}
              {c.unit && <span className="text-sm font-normal text-muted ml-1">{c.unit}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Daily Chart */}
      <div className="bg-surface border border-theme rounded-xl p-4 shrink-0">
        <h3 className="text-sm font-semibold text-primary mb-4">{t('report.byDate')}</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="actual" name={t('report.actual')} fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={36} />
              <Bar dataKey="defect" name={t('report.defect')} fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted text-sm">
            {loading ? '로딩 중...' : t('msg.noData')}
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-surface border border-theme rounded-xl p-4 flex flex-col gap-2 shrink-0"
        style={{ minHeight: 280 }}>
        <h3 className="text-sm font-semibold text-primary shrink-0">{t('report.byProduct')}</h3>
        <div className="flex-1 min-h-0">
          <Table columns={prodColumns} data={byProduct} loading={loading} emptyText={t('msg.noData')} />
        </div>
      </div>
    </div>
  )
}
