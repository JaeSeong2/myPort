// 문서 출력 센터 (팝업) — 좌측 문서리스트(다중선택) → 자동 미리보기 → 다중 인쇄(PDF 저장) - 2026-07-24
// 개편: 문서 종류 좌측 사이드바(조회조건 기준 2그룹), 다중 인쇄, 조건형 문서는 팝업에서 대상 다중 선택 - 2026-08-07
// 일반화: 대상 선택 팝업을 레지스트리(picker 설정) 주도로 전환 → 조건형 문서는 항목 추가만으로 확장 - 2026-08-07
import { useState, useEffect, useMemo } from 'react'
import { X, Printer, Star, Check, ChevronRight, Search, AlertTriangle } from 'lucide-react'
import { API_BASE } from '../../constants/api'
import { effectiveMonthRange } from '../../utils/effectiveMonth'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { DocSheet, DocHeader, DocSummary, DocFields, DocTable, DocSignatures } from './DocParts'

const COMPANY = '○○정밀공업(주)' // 문서 상단 회사명(플레이스홀더 — 실제 사명으로 교체)
const PRINT_WARN = 20            // 인쇄 예정 장수 경고 임계치 - 2026-08-07

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
const EQ_TYPE   = { PRODUCTION: '생산', UTILITY: '유틸리티', SAFETY: '안전', INSPECTION: '검사' }
const EQ_ST     = { RUNNING: '가동', IDLE: '대기', MAINTENANCE: '정비', BREAKDOWN: '고장' }

// 설비 점검표 기본 점검 항목(수기 기입용) - 2026-08-07
const EQ_CHECK_ITEMS = [
  { item: '외관 상태', std: '손상·부식 없음' },
  { item: '소음·진동', std: '이상 소음 없음' },
  { item: '윤활 상태', std: '적정 유량 유지' },
  { item: '누유·누수', std: '누출 없음' },
  { item: '작동 상태', std: '정상 작동' },
  { item: '안전장치', std: '정상 동작' },
]

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

// 설비 점검표 — 대상 설비 1대 = 1장 - 2026-08-07
function EqCheckDoc({ item }) {
  if (!item) {
    return <DocSheet><div style={{ textAlign: 'center', color: '#888', padding: 40 }}>대상 설비를 선택하세요.</div></DocSheet>
  }
  return (
    <DocSheet>
      <DocHeader company={COMPANY} title="설 비 점 검 표"
        meta={[{ label: '문서번호', value: `EQC-${ymd()}` }, { label: '발행일', value: today() }]} />
      <DocFields rows={[
        { label: '설비코드', value: item.code },
        { label: '설비명', value: item.name },
        { label: '유형', value: EQ_TYPE[item.eq_type] ?? item.eq_type },
        { label: '현재상태', value: EQ_ST[item.status] ?? item.status },
        { label: '설치위치', value: item.location || '-' },
        { label: '제조사', value: item.manufacturer || '-' },
        { label: '설치일', value: item.install_date || '-' },
      ]} />
      <div style={{ fontSize: 11, color: '#444', margin: '10px 0 2px', fontWeight: 600 }}>점검 항목</div>
      <DocTable
        columns={[
          { key: 'item', label: '점검 항목' },
          { key: 'std', label: '판정 기준' },
          { key: 'result', label: '판정', render: () => '' },
          { key: 'note', label: '비고', render: () => '' },
        ]}
        data={EQ_CHECK_ITEMS} />
      <DocSignatures />
    </DocSheet>
  )
}

// ── 템플릿 레지스트리 (여기에 추가하면 새 문서 지원) ──────────
// mode: 'list'   = 기간형(기간 내 전체 집계 = 1장) — 기간 외 조회조건 없음
//       'single' = 조건형(대상 1건 = 1장) — 기간 외 대상 선택 필요. picker 설정으로 팝업 자동 생성
//   picker: { title, primary(o), secondary(o), meta(o), search(o) }  ← 대상 선택 팝업 렌더 설정
// labelKey/titleKey = UI 로케일 키(사이드바·팝업 제목). 인쇄 문서 본문은 별도로 한국어 유지 - 2026-08-13
const TEMPLATES = [
  { id: 'prod-report', labelKey: 'doc.tpl.prodReport', mode: 'list',
    url: (p) => `${API_BASE}/api/productions?start_date=${p[0]}&end_date=${p[1]}`,
    Doc: ProdReportDoc },
  { id: 'qa-cert', labelKey: 'doc.tpl.qaCert', mode: 'list',
    url: (p) => `${API_BASE}/api/quality?start_date=${p[0]}&end_date=${p[1]}`,
    Doc: QaCertDoc },
  { id: 'wo-order', labelKey: 'doc.tpl.woOrder', mode: 'single', targetKey: 'order_id',
    url: (p) => `${API_BASE}/api/work-orders?start_date=${p[0]}&end_date=${p[1]}`,
    picker: {
      titleKey:  'doc.pick.woTitle',
      primary:   (o) => o.order_id,
      secondary: (o) => o.product_name,
      meta:      (o) => o.planned_start,
      search:    (o) => `${o.order_id} ${o.product_name ?? ''}`,
      periodic:  true,   // 기간에 따라 목록이 바뀜(안내 표시용)
    },
    Doc: WoOrderDoc },
  { id: 'eq-check', labelKey: 'doc.tpl.eqCheck', mode: 'single', targetKey: 'code',
    url: () => `${API_BASE}/api/equipment`,   // 마스터 — 기간 무관
    picker: {
      titleKey:  'doc.pick.eqTitle',
      primary:   (o) => o.code,
      secondary: (o) => o.name,
      meta:      (o) => EQ_TYPE[o.eq_type] ?? o.eq_type,
      search:    (o) => `${o.code} ${o.name ?? ''} ${o.location ?? ''}`,
      periodic:  false,
    },
    Doc: EqCheckDoc },
]

// ── 대상 선택 팝업 (레지스트리 picker 설정 주도) - 2026-08-07 ──
// 조건형 문서라면 어떤 것이든 tpl.picker 설정만으로 동일하게 렌더된다.
function TargetPicker({ tpl, list, period, initial, onApply, onClose }) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState(() => new Set(initial)) // 마운트 시 현재 선택으로 초기화
  const [q, setQ] = useState('')

  if (!tpl) return null
  const key = tpl.targetKey
  const P = tpl.picker
  const kw = q.trim().toLowerCase()
  const shown = kw ? list.filter((o) => P.search(o).toLowerCase().includes(kw)) : list

  const shownIds = shown.map((o) => o[key])
  const allShownChecked = shownIds.length > 0 && shownIds.every((id) => draft.has(id))

  const toggle = (id) => setDraft((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleAllShown = () => setDraft((prev) => {
    const next = new Set(prev)
    if (allShownChecked) shownIds.forEach((id) => next.delete(id))
    else shownIds.forEach((id) => next.add(id))
    return next
  })

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-surface border border-theme rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme shrink-0">
          <h3 className="text-primary font-semibold text-sm">
            {t(P.titleKey)}
            {P.periodic && <span className="text-muted font-normal"> · {period[0]} ~ {period[1]}</span>}
          </h3>
          <button onClick={onClose} className="text-muted hover-text-primary cursor-pointer"><X size={16} /></button>
        </div>

        {/* 검색 */}
        <div className="px-4 pt-3 shrink-0">
          <div className="flex items-center gap-2 bg-base border border-theme rounded-md px-2.5 py-1.5">
            <Search size={14} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('doc.pickerSearch')}
              className="flex-1 bg-transparent text-xs text-primary outline-none" />
          </div>
        </div>

        {/* 전체 선택 */}
        <button onClick={toggleAllShown}
          className="flex items-center gap-2 px-4 py-2.5 mt-2 mx-4 rounded-md border border-theme hover-bg-hover cursor-pointer shrink-0">
          <CheckBox on={allShownChecked} />
          <span className="text-xs font-medium text-primary">{t('doc.pickerSelectAll')}</span>
          <span className="ml-auto text-xs text-muted">{t('doc.pickerCount').replace('{n}', shown.length)}</span>
        </button>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
          {shown.length === 0 ? (
            <div className="py-10 text-center text-muted text-sm">{t('doc.pickerNone')}</div>
          ) : (
            <div className="flex flex-col">
              {shown.map((o) => (
                <button key={o[key]} onClick={() => toggle(o[key])}
                  className="flex items-center gap-2 px-1 py-2 rounded hover-bg-hover cursor-pointer text-left">
                  <CheckBox on={draft.has(o[key])} />
                  <span className="text-xs font-medium text-primary shrink-0">{P.primary(o)}</span>
                  <span className="text-xs text-muted truncate">· {P.secondary(o)}</span>
                  {P.meta && <span className="ml-auto text-[11px] text-muted shrink-0">{P.meta(o)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-theme shrink-0">
          <span className="text-xs text-muted">{t('doc.pickerSelected').replace('{n}', draft.size)}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs border border-theme text-muted hover-text-primary cursor-pointer">{t('btn.cancel')}</button>
            <button onClick={() => onApply(draft)} className="px-3 py-1.5 rounded-md text-xs bg-accent text-white hover:opacity-90 cursor-pointer">{t('doc.pickerApply').replace('{n}', draft.size)}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 체크박스 표시용 소형 컴포넌트
function CheckBox({ on }) {
  return (
    <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
      style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent)' : 'transparent' }}>
      {on && <Check size={12} className="text-white" strokeWidth={3} />}
    </span>
  )
}

// ── 팝업 본체 ────────────────────────────────────────────
export default function DocOutputModal({ open, onClose }) {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  const uid = (currentUser?.user_id ?? 'guest').toLowerCase()
  const favKey = `mes_doc_favs_${uid}`

  // 즐겨찾기 — 사용자별 localStorage - 2026-07-24
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(favKey)) ?? [] } catch { return [] }
  })
  const [selected, setSelected]     = useState(() => new Set([TEMPLATES[0].id])) // 인쇄 대상 템플릿 집합
  const [period, setPeriod]         = useState(monthRange)
  const [dataMap, setDataMap]       = useState({})     // { templateId: rows } (기간형)
  const [targetData, setTargetData] = useState({})     // { templateId: rows } (조건형 대상 목록)
  const [targetSel, setTargetSel]   = useState({})     // { templateId: Set } (선택된 대상 id)
  const [pickerFor, setPickerFor]   = useState(null)   // 열린 대상선택 팝업의 templateId (null=닫힘)
  const [loading, setLoading]       = useState(false)

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

  // 선택된 기간형 템플릿 데이터 로드 (기간·선택 변경 시 항상 재조회) - 2026-08-07
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const targets = TEMPLATES.filter((t) => t.mode === 'list' && selected.has(t.id))
    if (targets.length === 0) return
    setLoading(true)
    Promise.all(targets.map((t) =>
      fetch(t.url(period)).then((r) => r.json()).then((j) => [t.id, j.data ?? []]).catch(() => [t.id, []])
    )).then((entries) => {
      if (cancelled) return
      setDataMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, selected, period[0], period[1]]) // eslint-disable-line

  // 선택된 조건형 템플릿의 대상 목록 로드 (기간·선택 변경 시) — 유효하지 않은 선택은 정리 - 2026-08-07
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const singles = TEMPLATES.filter((t) => t.mode === 'single' && selected.has(t.id))
    if (singles.length === 0) return
    Promise.all(singles.map((t) =>
      fetch(t.url(period)).then((r) => r.json()).then((j) => [t.id, j.data ?? []]).catch(() => [t.id, []])
    )).then((entries) => {
      if (cancelled) return
      setTargetData((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
      setTargetSel((prev) => {
        const next = { ...prev }
        entries.forEach(([id, rows]) => {
          const key = TEMPLATES.find((t) => t.id === id).targetKey
          const valid = new Set(rows.map((o) => o[key]))
          next[id] = new Set([...(prev[id] ?? [])].filter((x) => valid.has(x)))
        })
        return next
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [open, selected, period[0], period[1]]) // eslint-disable-line

  const toggleFav = (id) =>
    setFavs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  // 문서 선택 토글 — 조건형은 켜면서 대상이 없으면 팝업 자동 오픈 - 2026-08-07
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        const t = TEMPLATES.find((x) => x.id === id)
        if (t?.mode === 'single' && (targetSel[id]?.size ?? 0) === 0) setPickerFor(id)
      }
      return next
    })
  }

  // 조회조건 기준 그룹 분리 — 기간형(list) / 조건형(single). 각 그룹 내 즐겨찾기 우선 - 2026-08-07
  const groups = useMemo(() => {
    const byFav = (a, b) => (favs.includes(b.id) ? 1 : 0) - (favs.includes(a.id) ? 1 : 0)
    return {
      period: TEMPLATES.filter((t) => t.mode === 'list').sort(byFav),
      target: TEMPLATES.filter((t) => t.mode === 'single').sort(byFav),
    }
  }, [favs])

  // 인쇄 예정 장수 = 선택된 기간형(각 1장) + 선택된 조건형 대상 건수 합 - 2026-08-07
  const listPages   = TEMPLATES.filter((t) => t.mode === 'list' && selected.has(t.id)).length
  const singlePages = TEMPLATES.filter((t) => t.mode === 'single' && selected.has(t.id))
    .reduce((s, t) => s + (targetSel[t.id]?.size ?? 0), 0)
  const totalPages = listPages + singlePages

  // 미리보기/인쇄 대상 문서 목록 생성 (선택 순서 = 리스트 순서) - 2026-08-07
  const pages = useMemo(() => {
    const out = []
    for (const t of TEMPLATES) {
      if (!selected.has(t.id)) continue
      if (t.mode === 'list') {
        out.push({ key: t.id, el: <t.Doc data={dataMap[t.id] ?? []} period={period} /> })
      } else {
        const rows = targetData[t.id] ?? []
        const sel  = targetSel[t.id] ?? new Set()
        rows.filter((o) => sel.has(o[t.targetKey])).forEach((o) =>
          out.push({ key: `${t.id}:${o[t.targetKey]}`, el: <t.Doc item={o} /> })
        )
      }
    }
    return out
  }, [selected, dataMap, period, targetData, targetSel]) // eslint-disable-line

  const doPrint = () => {
    if (totalPages === 0) return
    if (totalPages > PRINT_WARN &&
        !window.confirm(t('doc.printConfirm').replace('{n}', totalPages))) return
    window.print()
  }

  // 문서 종류 행 — 두 그룹에서 공용 렌더 (tpl=템플릿, t=번역함수) - 2026-08-07
  const renderTemplateRow = (tpl) => {
    const on = selected.has(tpl.id)
    const cnt = targetSel[tpl.id]?.size ?? 0
    return (
      <div key={tpl.id}>
        <div
          onClick={() => toggleSelect(tpl.id)}
          className={`group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
            on ? 'bg-accent-subtle' : 'hover-bg-hover'
          }`}
        >
          <CheckBox on={on} />
          <span className={`text-xs flex-1 truncate ${on ? 'text-accent font-medium' : 'text-primary'}`}>{t(tpl.labelKey)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); toggleFav(tpl.id) }}
            title={favs.includes(tpl.id) ? t('ui.favOff') : t('ui.fav')}
            className="p-0.5 rounded cursor-pointer shrink-0"
            style={{ color: favs.includes(tpl.id) ? 'var(--warning)' : 'var(--text-muted)' }}
          >
            <Star size={12} fill={favs.includes(tpl.id) ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* 조건형 문서 — 선택 시 대상 요약 + 변경(팝업) - 2026-08-07 */}
        {tpl.mode === 'single' && on && (
          <button onClick={() => setPickerFor(tpl.id)}
            className="flex items-center gap-1.5 mt-0.5 mb-1 ml-6 pl-2 pr-2 py-1.5 rounded-md border border-theme hover-bg-hover cursor-pointer"
            style={{ width: 'calc(100% - 1.5rem)' }}>
            <span className="text-[11px] text-primary">
              {cnt > 0 ? t('doc.targetCount').replace('{n}', cnt) : t('doc.targetSelect')}
            </span>
            <ChevronRight size={12} className="ml-auto text-muted" />
          </button>
        )}
      </div>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        className="bg-surface border border-theme rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 (인쇄 제외) */}
        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-theme shrink-0">
          <h2 className="text-primary font-semibold flex items-center gap-2"><Printer size={16} /> {t('doc.title')}</h2>
          <button onClick={onClose} className="text-muted hover-text-primary cursor-pointer"><X size={18} /></button>
        </div>

        {/* 컨트롤 바 — 좌측 인쇄 예정 장수 + 우측 기간·인쇄 (인쇄 제외) - 2026-08-07 */}
        <div className="no-print flex flex-wrap items-center gap-2 px-5 py-3 border-b border-theme shrink-0">
          {/* 인쇄 예정 장수 + 경고 (좌측) */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted">{t('doc.printPlan')}</span>
            <span className="font-semibold text-primary">{t('doc.pages').replace('{n}', totalPages)}</span>
            {totalPages > PRINT_WARN && (
              <span className="flex items-center gap-1 text-warning" title={`> ${PRINT_WARN}`}>
                <AlertTriangle size={13} />
              </span>
            )}
          </div>

          <div className="flex-1" />

          <input type="date" value={period[0]} onChange={(e) => setPeriod([e.target.value, period[1]])}
            className="text-xs bg-base border border-theme rounded-md px-2 py-1.5 text-primary" />
          <span className="text-muted text-xs">~</span>
          <input type="date" value={period[1]} onChange={(e) => setPeriod([period[0], e.target.value])}
            className="text-xs bg-base border border-theme rounded-md px-2 py-1.5 text-primary" />

          <button onClick={doPrint} disabled={totalPages === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <Printer size={13} /> {t('doc.print')}
          </button>
        </div>

        {/* 본문 — 좌측 사이드바(문서 리스트) + 우측 미리보기 */}
        <div className="flex-1 flex min-h-0">
          {/* 사이드바 (인쇄 제외) — 조회조건 기준 2그룹 - 2026-08-07 */}
          <aside className="no-print w-52 shrink-0 border-r border-theme overflow-y-auto p-3">
            {/* 그룹 1: 기간만으로 조회 */}
            <div className="flex items-center gap-1.5 px-1 mb-1.5">
              <span className="text-xs font-semibold text-muted">{t('doc.groupPeriod')}</span>
              <span className="text-[10px] text-muted opacity-70">{t('doc.noCondition')}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {groups.period.map(renderTemplateRow)}
            </div>

            {/* 그룹 2: 기간 외 대상 선택 필요 */}
            {groups.target.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-1 mt-4 mb-1.5 pt-3 border-t border-theme">
                  <span className="text-xs font-semibold text-muted">{t('doc.groupTarget')}</span>
                  <span className="text-[10px] text-muted opacity-70">{t('doc.extraCondition')}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {groups.target.map(renderTemplateRow)}
                </div>
              </>
            )}
          </aside>

          {/* 미리보기 */}
          <div className="flex-1 overflow-auto p-6" style={{ background: '#5a5a5a' }}>
            {loading && pages.length === 0 ? (
              <div className="print-area mx-auto" style={{ width: '210mm', maxWidth: '100%' }}>
                <DocSheet><div style={{ textAlign: 'center', color: '#888', padding: 48 }}>{t('doc.loading')}</div></DocSheet>
              </div>
            ) : totalPages === 0 ? (
              <div className="h-full flex items-center justify-center text-white/70 text-sm">
                {t('doc.selectPrompt')}
              </div>
            ) : (
              <div className="print-area mx-auto" style={{ width: '210mm', maxWidth: '100%' }}>
                {pages.map((p) => (
                  <div key={p.key} className="doc-page shadow-xl">{p.el}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 대상 선택 팝업 (레지스트리 picker 주도) */}
      {pickerFor && (
        <TargetPicker
          tpl={TEMPLATES.find((t) => t.id === pickerFor)}
          list={targetData[pickerFor] ?? []}
          period={period}
          initial={targetSel[pickerFor] ?? new Set()}
          onApply={(next) => { setTargetSel((prev) => ({ ...prev, [pickerFor]: next })); setPickerFor(null) }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  )
}
