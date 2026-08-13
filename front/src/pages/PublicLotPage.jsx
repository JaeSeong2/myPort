// 공개 모바일 LOT 조회 페이지 — QR 스캔 진입용(로그인 불필요, 읽기 전용) - 2026-08-02
// 물리적 제품의 QR → 이 페이지로 이동해 LOT 이력/품질/구성자재를 확인한다.
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Factory, ShieldCheck, Layers, Loader2, AlertTriangle, PackageSearch } from 'lucide-react'
import { API_BASE } from '../constants/api'
import { useLanguage } from '../context/LanguageContext'

// 상태 코드 → 색상 + 로케일 키(기존 lot.status / lot.log 재사용) - 2026-08-13
const LOT_STATUS = {
  CREATED:     { labelKey: 'lot.status.CREATED',     color: '#9ca3af' },
  IN_PROGRESS: { labelKey: 'lot.status.IN_PROGRESS', color: '#60a5fa' },
  COMPLETED:   { labelKey: 'lot.status.COMPLETED',   color: '#34d399' },
  ON_HOLD:     { labelKey: 'lot.status.ON_HOLD',     color: '#fbbf24' },
}

const LOG_STATUS = {
  PENDING:     { labelKey: 'lot.log.PENDING',     color: '#9ca3af' },
  IN_PROGRESS: { labelKey: 'lot.log.IN_PROGRESS', color: '#60a5fa' },
  COMPLETED:   { labelKey: 'lot.log.COMPLETED',   color: '#34d399' },
  SKIPPED:     { labelKey: 'lot.log.SKIPPED',     color: '#9ca3af' },
}

const fmtTime = (iso) => {
  if (!iso) return null
  const m = String(iso).match(/T(\d{2}:\d{2})/) || String(iso).match(/(\d{2}:\d{2})/)
  return m ? m[1] : null
}

export default function PublicLotPage() {
  const { t } = useLanguage()
  const { lotNo } = useParams()
  const [detail,   setDetail]   = useState(null)
  const [bom,      setBom]      = useState([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  // LOT 상세 조회(공개 API) — 성공 시 해당 품목의 BOM 구성자재도 함께 로드 - 2026-08-02
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setNotFound(false)
      try {
        const res = await fetch(`${API_BASE}/api/lots/${encodeURIComponent(lotNo)}/detail`)
        if (!res.ok) { if (!cancelled) setNotFound(true); return }
        const json = await res.json()
        if (cancelled) return
        setDetail(json)
        const code = json?.lot?.product_code
        if (code) {
          fetch(`${API_BASE}/api/bom?product_code=${encodeURIComponent(code)}`)
            .then((r) => r.json())
            .then((j) => { if (!cancelled) setBom(j.data ?? []) })
            .catch(() => {})
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [lotNo])

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={16} className="animate-spin" /> {t('pl.loading')}
        </div>
      </div>
    )
  }

  if (notFound || !detail) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={40} className="text-amber-400 mb-3" />
        <h1 className="text-primary font-semibold mb-1">{t('pl.notFound')}</h1>
        <p className="text-muted text-sm">
          {(() => {
            const [pre, post] = t('pl.notFoundDesc').split('{n}')
            return <>{pre}<b className="text-primary">{lotNo}</b>{post}</>
          })()}
        </p>
      </div>
    )
  }

  const { lot, process_logs: logs = [], inspections = [] } = detail
  const st = LOT_STATUS[lot.status] ?? { labelKey: null, color: '#9ca3af' }
  const ascending = [...logs].sort((a, b) => a.sequence - b.sequence)

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-md mx-auto px-4 py-5 flex flex-col gap-4">

        {/* 브랜드 헤더 */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-accent shrink-0">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-sm font-semibold text-primary">MES · {t('pl.brand')}</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full border border-theme text-muted">{t('pl.mobileView')}</span>
        </div>

        {/* LOT 헤더 카드 */}
        <div className="rounded-2xl p-5 bg-surface border border-theme">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-lg font-bold text-primary tracking-tight break-all">{lot.lot_no}</h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
              style={{ color: st.color, background: `${st.color}1a`, border: `1px solid ${st.color}55` }}>
              {st.labelKey ? t(st.labelKey) : lot.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <Info label={t('pl.itemCode')} value={lot.product_code} />
            <Info label={t('pl.itemName')} value={lot.product_name} />
            <Info label={t('pl.orderId')} value={lot.order_id} />
            <Info label={t('pl.qty')} value={`${lot.planned_qty} EA`} />
            <Info label={t('pl.openedAt')} value={lot.opened_at} />
            <Info label={t('pl.closedAt')} value={lot.closed_at ?? '-'} />
          </div>
          {lot.note && <p className="mt-3 pt-3 border-t border-theme text-xs text-muted">{lot.note}</p>}
        </div>

        {/* 공정 이력 */}
        <Section icon={Factory} title={t('pl.procHistory')}>
          {ascending.length === 0 ? (
            <Empty text={t('pl.noProc')} />
          ) : (
            <div className="flex flex-col gap-2">
              {ascending.map((log) => {
                const ls = LOG_STATUS[log.status] ?? { labelKey: null, color: '#9ca3af' }
                const time = [fmtTime(log.started_at), fmtTime(log.completed_at)].filter(Boolean).join(' ~ ')
                return (
                  <div key={log._id} className="flex items-center gap-3 rounded-xl border border-theme bg-base px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ background: ls.color }}>
                      {log.sequence}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-primary truncate">{log.process_name}</span>
                        <span className="text-xs font-semibold shrink-0" style={{ color: ls.color }}>{ls.labelKey ? t(ls.labelKey) : log.status}</span>
                      </div>
                      <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-2">
                        <span>{log.process_code}</span>
                        {time && <span>⏱ {time}</span>}
                        {log.worker_code && <span>· {log.worker_code}</span>}
                        {log.actual_qty != null && <span>· {t('pl.good')} {log.good_qty ?? log.actual_qty}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* 품질 검사 */}
        <Section icon={ShieldCheck} title={t('pl.qaTitle')}>
          {inspections.length === 0 ? (
            <Empty text={t('pl.noQa')} />
          ) : (
            <div className="flex flex-col gap-2">
              {inspections.map((qa) => {
                const passed = (qa.passed ?? 0) >= (qa.quantity ?? 0)
                return (
                  <div key={qa._id} className="flex items-center justify-between rounded-xl border border-theme bg-base px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm text-primary truncate">{qa.inspect_type ?? t('pl.inspect')}</div>
                      <div className="text-xs text-muted">{qa.inspect_date} · {t('pl.qty')} {qa.quantity ?? '-'} / {t('pl.passed')} {qa.passed ?? '-'}</div>
                    </div>
                    <span className="text-xs font-semibold shrink-0"
                      style={{ color: passed ? '#34d399' : '#f87171' }}>
                      {passed ? t('pl.pass') : t('pl.fail')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* 투입 자재 (BOM 구성) */}
        <Section icon={Layers} title={t('pl.bomTitle')}>
          {bom.length === 0 ? (
            <Empty text={t('pl.noBom')} />
          ) : (
            <div className="flex flex-col gap-2">
              {bom.map((m) => (
                <div key={m._id} className="flex items-center justify-between rounded-xl border border-theme bg-base px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm text-primary truncate">{m.material_name ?? m.material_code}</div>
                    <div className="text-xs text-muted">{m.material_code}</div>
                  </div>
                  <span className="text-xs font-medium text-primary shrink-0">{m.quantity} {m.unit}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <p className="text-center text-xs text-muted flex items-center justify-center gap-1 pt-2 pb-4">
          <PackageSearch size={12} /> {t('pl.footer')}
        </p>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-muted mb-0.5">{label}</div>
      <div className="font-semibold text-primary truncate">{value}</div>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl p-4 bg-surface border border-theme">
      <h2 className="text-sm font-semibold text-primary flex items-center gap-1.5 mb-3">
        <Icon size={15} className="text-accent" /> {title}
      </h2>
      {children}
    </div>
  )
}

function Empty({ text }) {
  return <p className="text-xs text-muted text-center py-4">{text}</p>
}
