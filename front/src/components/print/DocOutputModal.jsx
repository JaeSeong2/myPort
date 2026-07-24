// 문서 출력 센터 (팝업) — 템플릿/기간 선택 → 자동 미리보기 → 인쇄(PDF 저장) - 2026-07-24
import { useState, useEffect, useMemo } from 'react'
import { X, Printer, Star } from 'lucide-react'
import { API_BASE } from '../../constants/api'
import { effectiveMonthRange } from '../../utils/effectiveMonth'
import { useAuth } from '../../context/AuthContext'
import { DocSheet, DocHeader, DocSummary, DocFields, DocTable, DocSignatures } from './DocParts'

const COMPANY = '○○정밀공업(주)' // 문서 상단 회사명(플레이스홀더 — 실제 사명으로 교체)

// 로컬 기준 YYYY-MM-DD (toISOString은 UTC라 KST에서 하루 밀림 → 직접 포맷) - 2026-07-24
const fmt   = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = () => fmt(new Date())
const ymd   = () => today().replace(/-/g, '')
const sum   = (arr, k) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0)

// 이번 달 1일~말일 기본 기간 (로컬 기준)
const monthRange = () => {
  const n = new Date()
  return [fmt(new Date(n.getFullYear(), n.getMonth(), 1)), fmt(new Date(n.getFullYear(), n.getMonth() + 1, 0))]
}

// 코드 → 한글 라벨
const PROD_ST   = { ONGOING: '진행중', COMPLETED: '완료' }
const QA_TYPE   = { INCOMING: '수입검사', IN_PROCESS: '공정검사', FINAL: '최종검사' }
const QA_RESULT = { PASS: '합격', CONDITIONAL: '조건부', FAIL: '불합격' }
const WO_TYPE   = { NORMAL: '일반', URGENT: '긴급', REWORK: '재작업' }
const WO_PRI    = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' }
const WO_ST     = { PENDING: '대기', IN_PROG: '진행중', STOPPED: '중단', DONE: '완료' }

// ── 문서 템플릿 (렌더러) ──────────────────────────────────
function ProdReportDoc({ data, period }) {
  const actual = sum(data, 'actual_qty'), defect = sum(data, 'defect_qty')
  return (
    <DocSheet>
      <DocHeader company={COMPANY} title="생산실적 보고서"
        meta={[{ label: '문서번호', value: `PRD-${ymd()}` }, { label: '발행일', value: today() }]} />
      <div style={{ fontSize: 11, color: '#444', marginBottom: 4 }}>대상기간: {period[0]} ~ {period[1]}</div>
      <DocSummary items={[
        { label: '실적 건수', value: `${data.length} 건` },
        { label: '계획 합계', value: sum(data, 'planned_qty').toLocaleString() },
        { label: '실적 합계', value: actual.toLocaleString() },
        { label: '불량 합계', value: defect.toLocaleString() },
        { label: '양품 합계', value: sum(data, 'good_qty').toLocaleString() },
        { label: '불량률', value: `${actual > 0 ? ((defect / actual) * 100).toFixed(1) : 0}%` },
      ]} />
      <DocTable
        columns={[
          { key: 'prod_id', label: '실적번호' },
          { key: 'product_name', label: '제품명' },
          { key: 'planned_qty', label: '계획' },
          { key: 'actual_qty', label: '실적' },
          { key: 'defect_qty', label: '불량', render: (r) => r.defect_qty ?? 0 },
          { key: 'good_qty', label: '양품', render: (r) => r.good_qty ?? 0 },
          { key: 'work_date', label: '작업일' },
          { key: 'worker_code', label: '작업자' },
          { key: 'status', label: '상태', render: (r) => PROD_ST[r.status] ?? r.status },
        ]}
        data={data} />
      <DocSignatures />
    </DocSheet>
  )
}

function QaCertDoc({ data, period }) {
  const avgPass = data.length ? (data.reduce((s, q) => s + (Number(q.pass_rate) || 0), 0) / data.length).toFixed(1) : 0
  return (
    <DocSheet>
      <DocHeader company={COMPANY} title="품질검사 성적서"
        meta={[{ label: '문서번호', value: `QAR-${ymd()}` }, { label: '발행일', value: today() }]} />
      <div style={{ fontSize: 11, color: '#444', marginBottom: 4 }}>대상기간: {period[0]} ~ {period[1]}</div>
      <DocSummary items={[
        { label: '검사 건수', value: `${data.length} 건` },
        { label: '검사수량 합계', value: sum(data, 'quantity').toLocaleString() },
        { label: '합격 합계', value: sum(data, 'passed').toLocaleString() },
        { label: '불합격 합계', value: sum(data, 'failed').toLocaleString() },
        { label: '평균 합격률', value: `${avgPass}%` },
      ]} />
      <DocTable
        columns={[
          { key: 'inspect_id', label: '검사번호' },
          { key: 'product_name', label: '제품명' },
          { key: 'inspect_type', label: '검사유형', render: (r) => QA_TYPE[r.inspect_type] ?? r.inspect_type },
          { key: 'quantity', label: '수량' },
          { key: 'passed', label: '합격' },
          { key: 'failed', label: '불합격' },
          { key: 'pass_rate', label: '합격률', render: (r) => `${r.pass_rate ?? 0}%` },
          { key: 'result', label: '결과', render: (r) => QA_RESULT[r.result] ?? r.result },
          { key: 'inspector', label: '검사자' },
          { key: 'inspect_date', label: '검사일' },
        ]}
        data={data} />
      <DocSignatures />
    </DocSheet>
  )
}

function WoOrderDoc({ item }) {
  if (!item) {
    return <DocSheet><div style={{ textAlign: 'center', color: '#888', padding: 40 }}>대상 작업지시를 선택하세요.</div></DocSheet>
  }
  return (
    <DocSheet>
      <DocHeader company={COMPANY} title="작 업 지 시 서"
        meta={[{ label: '지시번호', value: item.order_id }, { label: '발행일', value: today() }]} />
      <DocFields rows={[
        { label: '제품코드', value: item.product_code },
        { label: '제품명', value: item.product_name },
        { label: '지시수량', value: `${item.quantity} ${item.unit ?? ''}` },
        { label: '유형', value: WO_TYPE[item.type] ?? item.type },
        { label: '우선순위', value: WO_PRI[item.priority] ?? item.priority },
        { label: '계획기간', value: `${item.planned_start} ~ ${item.planned_end}` },
        { label: '담당자', value: item.assignee },
        { label: '공정', value: item.process_code },
        { label: '상태', value: WO_ST[item.status] ?? item.status },
        { label: '비고', value: item.note || '-' },
      ]} />
      <DocSignatures />
    </DocSheet>
  )
}

// ── 템플릿 레지스트리 (여기에 추가하면 새 문서 지원) ──────────
const TEMPLATES = [
  { id: 'prod-report', label: '생산실적 보고서', mode: 'list',
    url: (p) => `${API_BASE}/api/productions?start_date=${p[0]}&end_date=${p[1]}`,
    Doc: ProdReportDoc },
  { id: 'qa-cert', label: '품질검사 성적서', mode: 'list',
    url: (p) => `${API_BASE}/api/quality?start_date=${p[0]}&end_date=${p[1]}`,
    Doc: QaCertDoc },
  { id: 'wo-order', label: '작업지시서', mode: 'single', targetKey: 'order_id',
    targetLabel: (o) => `${o.order_id} | ${o.product_name}`,
    url: (p) => `${API_BASE}/api/work-orders?start_date=${p[0]}&end_date=${p[1]}`,
    Doc: WoOrderDoc },
]

// ── 팝업 본체 ────────────────────────────────────────────
export default function DocOutputModal({ open, onClose }) {
  const { currentUser } = useAuth()
  const uid = (currentUser?.user_id ?? 'guest').toLowerCase()
  const favKey = `mes_doc_favs_${uid}`

  // 즐겨찾기 — 사용자별 localStorage - 2026-07-24
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(favKey)) ?? [] } catch { return [] }
  })
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id)
  const [period, setPeriod] = useState(monthRange)
  const [target, setTarget] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(favKey, JSON.stringify(favs)) } catch {}
  }, [favKey, favs])

  // 열릴 때 최신월 폴백 — 현재월에 데이터 없으면 데이터 있는 최근 월로 기본기간 설정 - 2026-07-24
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch(`${API_BASE}/api/productions`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const { start, end } = effectiveMonthRange(j.data ?? [], 'work_date')
        setPeriod([start, end])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open])

  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]

  // 템플릿·기간 변경 시 자동 조회 → 미리보기 갱신 - 2026-07-24
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch(tpl.url(period))
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const rows = j.data ?? []
        setData(rows)
        if (tpl.mode === 'single') setTarget(rows[0]?.[tpl.targetKey] ?? '')
      })
      .catch(() => { if (!cancelled) setData([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, templateId, period[0], period[1]]) // eslint-disable-line

  const toggleFav = (id) =>
    setFavs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  // 즐겨찾기 우선 정렬 (안정)
  const orderedTemplates = useMemo(
    () => [...TEMPLATES].sort((a, b) => (favs.includes(b.id) ? 1 : 0) - (favs.includes(a.id) ? 1 : 0)),
    [favs]
  )

  if (!open) return null

  const singleItem = tpl.mode === 'single' ? data.find((o) => o[tpl.targetKey] === target) : null
  const Doc = tpl.Doc

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        className="bg-surface border border-theme rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 (인쇄 제외) */}
        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-theme shrink-0">
          <h2 className="text-primary font-semibold flex items-center gap-2"><Printer size={16} /> 문서 출력</h2>
          <button onClick={onClose} className="text-muted hover-text-primary cursor-pointer"><X size={18} /></button>
        </div>

        {/* 컨트롤 (인쇄 제외) */}
        <div className="no-print flex flex-wrap items-center gap-2 px-5 py-3 border-b border-theme shrink-0">
          {/* 템플릿 칩 + 즐겨찾기 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {orderedTemplates.map((t) => (
              <div
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                  templateId === t.id ? 'border-accent text-accent bg-accent-subtle' : 'border-theme text-muted hover-text-primary'
                }`}
              >
                <span>{t.label}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFav(t.id) }}
                  title={favs.includes(t.id) ? '즐겨찾기 해제' : '즐겨찾기'}
                  className="p-0.5 rounded cursor-pointer"
                  style={{ color: favs.includes(t.id) ? 'var(--warning)' : 'var(--text-muted)' }}
                >
                  <Star size={12} fill={favs.includes(t.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex-1" />

          {/* 기간 */}
          <input type="date" value={period[0]} onChange={(e) => setPeriod([e.target.value, period[1]])}
            className="text-xs bg-base border border-theme rounded-md px-2 py-1.5 text-primary" />
          <span className="text-muted text-xs">~</span>
          <input type="date" value={period[1]} onChange={(e) => setPeriod([period[0], e.target.value])}
            className="text-xs bg-base border border-theme rounded-md px-2 py-1.5 text-primary" />

          {/* 단건 대상 선택 */}
          {tpl.mode === 'single' && (
            <select value={target} onChange={(e) => setTarget(e.target.value)}
              className="text-xs bg-base border border-theme rounded-md px-2 py-1.5 text-primary max-w-56">
              {data.length === 0
                ? <option value="">대상 없음</option>
                : data.map((o) => <option key={o[tpl.targetKey]} value={o[tpl.targetKey]}>{tpl.targetLabel(o)}</option>)}
            </select>
          )}

          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer">
            <Printer size={13} /> 인쇄
          </button>
        </div>

        {/* 미리보기 */}
        <div className="flex-1 overflow-auto p-6" style={{ background: '#5a5a5a' }}>
          <div className="print-area mx-auto shadow-xl" style={{ width: '210mm', maxWidth: '100%' }}>
            {loading
              ? <DocSheet><div style={{ textAlign: 'center', color: '#888', padding: 48 }}>불러오는 중…</div></DocSheet>
              : tpl.mode === 'single'
                ? <Doc item={singleItem} />
                : <Doc data={data} period={period} />}
          </div>
        </div>
      </div>
    </div>
  )
}
