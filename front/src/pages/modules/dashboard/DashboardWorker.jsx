// 작업자 대시보드 패널 - 2026-05-30
import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Factory, Wrench, AlertTriangle } from 'lucide-react'
import { API_BASE } from '../../../constants/api'
import { useAuth } from '../../../context/AuthContext'

const WO_API   = `${API_BASE}/api/work-orders`
const PROD_API = `${API_BASE}/api/productions`
const EQ_API   = `${API_BASE}/api/equipment`

const fmtDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const STATUS_STYLE = {
  PENDING:   { label: '대기',   cls: 'bg-yellow-400/15 text-yellow-400' },
  IN_PROG:   { label: '진행중', cls: 'bg-blue-400/15 text-blue-400'   },
  DONE:      { label: '완료',   cls: 'bg-emerald-400/15 text-emerald-400' },
  STOPPED:   { label: '중단',   cls: 'bg-red-400/15 text-red-400'     },
  ONGOING:   { label: '진행중', cls: 'bg-blue-400/15 text-blue-400'   },
  COMPLETED: { label: '완료',   cls: 'bg-emerald-400/15 text-emerald-400' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { label: status, cls: 'bg-gray-400/15 text-gray-400' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default function DashboardWorker() {
  const { currentUser } = useAuth()
  const workerCode = currentUser?.worker_code ?? ''

  const [myWO,      setMyWO]      = useState([])
  const [myProd,    setMyProd]    = useState([])
  const [eqSummary, setEqSummary] = useState({ running: 0, breakdown: 0, maintenance: 0 })
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    if (!workerCode) { setLoading(false); return }
    setLoading(true)
    try {
      const today = fmtDate(new Date())

      const [woRes, prodRes, eqRes] = await Promise.all([
        fetch(`${WO_API}`).then(r => r.json()),
        fetch(`${PROD_API}?worker_code=${encodeURIComponent(workerCode)}&start_date=${today}&end_date=${today}`).then(r => r.json()),
        fetch(EQ_API).then(r => r.json()),
      ])

      const allWO = woRes.data ?? []
      setMyWO(
        allWO
          .filter(w => w.assignee === workerCode && (w.status === 'PENDING' || w.status === 'IN_PROG'))
          .sort((a, b) => {
            const order = { IN_PROG: 0, PENDING: 1 }
            return (order[a.status] ?? 9) - (order[b.status] ?? 9)
          })
      )

      setMyProd(prodRes.data ?? [])

      const eqs = eqRes.data ?? []
      setEqSummary({
        running:     eqs.filter(e => e.status === 'RUNNING').length,
        breakdown:   eqs.filter(e => e.status === 'BREAKDOWN').length,
        maintenance: eqs.filter(e => e.status === 'MAINTENANCE').length,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [workerCode])

  useEffect(() => { load() }, [load])

  if (!workerCode) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted">
        <AlertTriangle size={32} className="opacity-40" />
        <p className="text-sm">담당 작업자 코드가 설정되지 않았습니다.</p>
        <p className="text-xs opacity-60">관리자에게 worker_code 등록을 요청하세요.</p>
      </div>
    )
  }

  const todayDefect = myProd.reduce((s, p) => s + (p.defect_qty ?? 0), 0)

  const SUMMARY_CARDS = [
    { icon: <ClipboardList size={18} />, label: '배정된 작업지시', value: loading ? '—' : myWO.length,      unit: '건', color: '#60a5fa' },
    { icon: <Factory size={18} />,       label: '오늘 생산실적',   value: loading ? '—' : myProd.length,    unit: '건', color: '#34d399' },
    { icon: <AlertTriangle size={18} />, label: '오늘 불량수량',   value: loading ? '—' : todayDefect,      unit: 'EA', color: '#f87171' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-primary text-lg font-semibold">오늘의 작업 현황</h2>
        <p className="text-xs text-muted mt-0.5">{currentUser?.name} · {workerCode}</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {SUMMARY_CARDS.map((c, i) => (
          <div key={i} className="bg-surface border border-theme rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted">{c.label}</span>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{c.value}</span>
              <span className="text-sm text-muted">{c.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 내 작업지시 */}
      <div className="bg-surface border border-theme rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">내 작업지시</h3>
        {loading ? (
          <p className="text-xs text-muted py-4 text-center">로딩 중...</p>
        ) : myWO.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">배정된 작업지시가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myWO.map((w, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-theme last:border-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-primary">{w.order_id}</span>
                  <span className="text-xs text-muted">{w.product_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{w.planned_start} ~ {w.planned_end}</span>
                  <span className="text-xs text-muted">{w.quantity} {w.unit}</span>
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 오늘 생산실적 */}
      <div className="bg-surface border border-theme rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">오늘 생산실적</h3>
        {loading ? (
          <p className="text-xs text-muted py-4 text-center">로딩 중...</p>
        ) : myProd.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">오늘 입력된 생산실적이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myProd.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-theme last:border-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-primary">{p.prod_id}</span>
                  <span className="text-xs text-muted">{p.product_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">실적 <strong className="text-primary">{p.actual_qty}</strong></span>
                  {p.defect_qty > 0 && (
                    <span className="text-xs text-red-400">불량 {p.defect_qty}</span>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 설비 현황 요약 */}
      <div className="bg-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={14} className="text-muted" />
          <h3 className="text-sm font-semibold text-primary">설비 현황</h3>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-xs text-muted">가동 <strong className="text-primary">{eqSummary.running}</strong>대</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span className="text-xs text-muted">고장 <strong className="text-primary">{eqSummary.breakdown}</strong>대</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            <span className="text-xs text-muted">점검 <strong className="text-primary">{eqSummary.maintenance}</strong>대</span>
          </div>
        </div>
      </div>
    </div>
  )
}
