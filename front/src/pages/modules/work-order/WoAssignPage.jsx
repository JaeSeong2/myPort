// 작업 배정(디스패치 보드) — 대기 작업지시를 작업자에게 드래그/클릭으로 배정 - 2026-09-01
//   · 배정 = work-orders PUT { assignee } (기존 API 재사용, 백엔드 변경 없음)
//   · PENDING 카드만 이동 가능, IN_PROG는 부하 참고용으로 잠금 표시
//   · 드래그(데스크톱) + 카드 선택→컬럼 클릭(터치) 두 방식 모두 지원
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Lock, RefreshCw, GripVertical, Users, AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import { Field, Input, Select, PageTitle } from '../../../components/common/FormControls'
import Badge, { TYPE_BADGE, PRIORITY_BADGE } from '../../../components/common/Badge'
import { probeMonthRange } from '../../../utils/effectiveMonth'
import { API_BASE } from '../../../constants/api'

const API        = `${API_BASE}/api/work-orders`
const MASTER_API = `${API_BASE}/api/master`
const POOL = '__pool__'  // 미배정 컬럼 키

// 보드에 올릴 상태(대기=이동가능, 진행=잠금 참고)
const BOARD_STATUS = ['PENDING', 'IN_PROG']

// 작업자 부하상한(수량 합계 기준) — UI 조정값, localStorage 유지 - 2026-09-01
const CAP_KEY = 'wa.capacity'
const DEFAULT_CAP = 1000
const readCap = () => {
  const v = Number(localStorage.getItem(CAP_KEY))
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_CAP
}

export default function AssignPage() {
  const { t } = useLanguage()
  const { actions } = useAuth()
  const canEdit = !!actions.edit

  const [rows,    setRows]    = useState([])       // 보드 대상 작업지시
  const [workers, setWorkers] = useState([])       // 활성 작업자 [{code,name}]
  const [procOpts, setProcOpts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ start: '', end: '', process: 'ALL' })
  const [capacity, setCapacity] = useState(readCap)
  const [selected, setSelected] = useState(null)   // 클릭 선택된 _id
  const [dragId,  setDragId]  = useState(null)      // 드래그 중 _id
  const [overCol, setOverCol] = useState(null)      // 드롭 하이라이트 컬럼
  const [toast,   setToast]   = useState(null)      // {type:'saving'|'saved'|'error'}
  const toastTimer = useRef(null)

  // ── 조회 ──────────────────────────────────────────────
  // f를 명시 인자로 받아 stable하게 유지(필터 변경 → 자동 재조회) - 2026-09-01
  const load = useCallback(async (f) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.start)  p.set('start_date', f.start)  // work-orders는 planned_start 기준 필터
      if (f.end)    p.set('end_date',   f.end)
      const res  = await fetch(`${API}?${p}`)
      const json = await res.json()
      let data = (json.data ?? []).filter(r => BOARD_STATUS.includes(r.status))
      if (f.process !== 'ALL') data = data.filter(r => r.process_code === f.process) // 공정은 클라 필터
      setRows(data)
    } catch { setRows([]) }
    finally  { setLoading(false) }
  }, [])

  // 활성 작업자 + 공정 마스터 로드
  useEffect(() => {
    const loadMaster = (cat, setter) =>
      fetch(`${MASTER_API}?category=${cat}&active_only=true`)
        .then(r => r.json())
        .then(j => setter(j.data ?? []))
        .catch(() => {})
    loadMaster('employee', setWorkers)
    loadMaster('process',  setProcOpts)
  }, [])

  // 최초 진입: 데이터 있는 최신월을 기본 기간으로 채움(빈 날짜칸 방지, 다른 화면과 통일) - 2026-09-01
  useEffect(() => {
    (async () => {
      const [start, end] = await probeMonthRange(API, 'planned_start')
      setFilters(prev => ({ ...prev, start, end }))
    })()
  }, [])

  // 필터(기간·공정) 변경 시 자동 재조회 - 2026-09-01
  useEffect(() => { load(filters) }, [filters, load])

  const setF = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  // ── 컬럼 구성: 미배정 + 작업자별 ─────────────────────
  const columns = useMemo(() => {
    const workerCodes = new Set(workers.map(w => w.code))
    const buckets = { [POOL]: [] }
    workers.forEach(w => { buckets[w.code] = [] })
    for (const r of rows) {
      const key = r.assignee && workerCodes.has(r.assignee) ? r.assignee : POOL
      buckets[key].push(r)
    }
    // 카드 정렬: 우선순위(HIGH>MEDIUM>LOW) → 계획시작일
    const prioRank = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    Object.values(buckets).forEach(list => list.sort((a, b) =>
      (prioRank[a.priority] ?? 9) - (prioRank[b.priority] ?? 9) ||
      String(a.planned_start).localeCompare(String(b.planned_start))))
    const cols = [{ key: POOL, name: t('wa.unassigned'), items: buckets[POOL] }]
    workers.forEach(w => cols.push({ key: w.code, name: w.name, items: buckets[w.code] }))
    return cols
  }, [rows, workers, t])

  const changeCapacity = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return  // 빈값/0은 무시(직전 유효값 유지)
    setCapacity(n)
    try { localStorage.setItem(CAP_KEY, String(n)) } catch { /* 무시 */ }
  }

  const pendingCount  = useMemo(() => rows.filter(r => r.status === 'PENDING').length, [rows])
  const assignedCount = useMemo(() =>
    rows.filter(r => r.status === 'PENDING' && r.assignee &&
      workers.some(w => w.code === r.assignee)).length, [rows, workers])

  // ── 배정 실행(낙관적 업데이트 + 롤백) ────────────────
  const flashToast = (type) => {
    setToast({ type })
    clearTimeout(toastTimer.current)
    if (type !== 'saving') toastTimer.current = setTimeout(() => setToast(null), 1600)
  }

  const assign = useCallback(async (id, targetKey) => {
    const row = rows.find(r => r._id === id)
    if (!row || row.status !== 'PENDING') return
    const newAssignee = targetKey === POOL ? '' : targetKey
    if ((row.assignee || '') === newAssignee) return

    const prev = rows
    setRows(rs => rs.map(r => r._id === id ? { ...r, assignee: newAssignee } : r))
    flashToast('saving')
    try {
      const res = await fetch(`${API}/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assignee: newAssignee }),
      })
      if (!res.ok) throw new Error('save failed')
      flashToast('saved')
    } catch {
      setRows(prev)          // 롤백
      flashToast('error')
    }
  }, [rows])

  // ── 드롭/클릭 핸들러 ──────────────────────────────────
  const handleDrop = (colKey) => {
    setOverCol(null)
    if (dragId != null) { assign(dragId, colKey); setDragId(null); setSelected(null) }
  }
  const handleColClick = (colKey) => {
    if (selected != null) { assign(selected, colKey); setSelected(null) }
  }
  const toggleSelect = (id) => setSelected(s => (s === id ? null : id))

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <PageTitle title={t('wa.title')} />

      {/* 툴바 */}
      <div className="flex items-end gap-3 flex-wrap">
        <Field label={t('wo.plannedStart')}>
          <Input type="date" value={filters.start} onChange={e => setF('start', e.target.value)} />
        </Field>
        <Field label={t('wo.plannedEnd')}>
          <Input type="date" value={filters.end} onChange={e => setF('end', e.target.value)} />
        </Field>
        <Field label={t('wa.process')}>
          <Select value={filters.process} onChange={e => setF('process', e.target.value)}
            options={[{ value: 'ALL', label: t('opt.all') },
              ...procOpts.map(o => ({ value: o.code, label: `${o.code} ${o.name}` }))]} />
        </Field>
        <div className="w-28">
          <Field label={t('wa.capacity')}>
            <Input type="number" value={capacity} onChange={e => changeCapacity(e.target.value)} />
          </Field>
        </div>
        <button onClick={() => load(filters)} disabled={loading}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md text-sm border border-theme text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('wa.refresh')}
        </button>

        <div className="ml-auto flex items-center gap-4 text-sm">
          <StatusToast toast={toast} t={t} />
          <span className="text-muted">{t('wa.pendingTotal')}
            <b className="ml-1.5 text-primary tabular-nums">{pendingCount - assignedCount}</b></span>
          <span className="text-muted">{t('wa.assignedTotal')}
            <b className="ml-1.5 text-accent tabular-nums">{assignedCount}</b></span>
        </div>
      </div>

      <p className="text-xs text-muted flex items-center gap-1.5 -mt-1">
        <GripVertical size={13} /> {canEdit ? t('wa.hintDrag') : t('wa.readOnly')}
      </p>

      {/* 보드 */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto pb-2">
        {columns.map(col => (
          <BoardColumn
            key={col.key} col={col} t={t} capacity={capacity}
            canEdit={canEdit} isPool={col.key === POOL}
            over={overCol === col.key} selected={selected} dragId={dragId}
            onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOverCol(col.key) } }}
            onDragLeave={() => setOverCol(o => (o === col.key ? null : o))}
            onDrop={() => canEdit && handleDrop(col.key)}
            onColClick={() => canEdit && selected != null && handleColClick(col.key)}
            onCardDragStart={setDragId}
            onCardDragEnd={() => { setDragId(null); setOverCol(null) }}
            onCardClick={toggleSelect}
          />
        ))}
      </div>
    </div>
  )
}

// ── 컬럼 ─────────────────────────────────────────────────
function BoardColumn({ col, t, capacity, canEdit, isPool, over, selected, dragId,
  onDragOver, onDragLeave, onDrop, onColClick, onCardDragStart, onCardDragEnd, onCardClick }) {
  const qtySum = col.items.reduce((s, r) => s + (r.quantity || 0), 0)
  const showDropHint = canEdit && selected != null && (dragId == null)

  // 부하율 = 배정 수량 / 상한 (미배정 풀은 상한 개념 없음)
  const cap = capacity > 0 ? capacity : 1
  const ratio = qtySum / cap
  const pct = Math.round(ratio * 100)
  const over100 = !isPool && ratio > 1
  const warn80  = !isPool && ratio >= 0.8 && ratio <= 1
  const barColor = isPool ? 'var(--text-muted)'
    : over100 ? 'var(--danger)' : warn80 ? 'var(--warning)' : 'var(--accent)'
  return (
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={onColClick}
      className={`w-64 shrink-0 flex flex-col rounded-xl border bg-surface elev-1 overflow-hidden transition-colors
        ${over ? 'border-accent bg-accent-subtle' : 'border-theme'}
        ${showDropHint ? 'cursor-pointer hover-bg-elevated' : ''}`}
    >
      {/* 헤더 */}
      <div className="px-3 py-2.5 border-b border-subtle-theme flex items-center gap-2 shrink-0">
        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0
          ${isPool ? 'bg-elevated text-muted' : 'bg-accent-subtle text-accent'}`}>
          <Users size={13} />
        </span>
        <span className="text-sm font-medium text-primary truncate flex-1">{col.name}</span>
        {over100 && (
          <AlertTriangle size={13} className="text-danger shrink-0"
            aria-label={t('wa.over')} />
        )}
        <span className="text-xs text-muted tabular-nums shrink-0">{col.items.length}{t('wa.count')}</span>
      </div>

      {/* 부하 바 (상한 대비) */}
      <div className="px-3 pt-2 shrink-0">
        <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, ratio * 100)}%`, background: barColor }} />
        </div>
        <div className="mt-1 text-[11px] flex justify-between">
          <span className="text-muted">
            {isPool ? t('wa.qtySum')
              : <>{t('wa.util')} <span style={{ color: barColor }} className="tabular-nums font-medium">{pct}%</span></>}
          </span>
          <span className="tabular-nums text-secondary">
            {isPool ? qtySum.toLocaleString() : `${qtySum.toLocaleString()} / ${cap.toLocaleString()}`}
            {over100 && <span className="text-danger ml-1">+{(qtySum - cap).toLocaleString()} {t('wa.over')}</span>}
          </span>
        </div>
      </div>

      {/* 카드 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
        {col.items.map(r => (
          <OrderCard key={r._id} row={r} t={t} canEdit={canEdit}
            selected={selected === r._id}
            onDragStart={onCardDragStart} onDragEnd={onCardDragEnd} onClick={onCardClick} />
        ))}
        {showDropHint && (
          <div className="mt-auto text-center text-[11px] text-accent border border-dashed border-accent rounded-lg py-1.5">
            {t('wa.moveHere')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 작업지시 카드 ─────────────────────────────────────────
function OrderCard({ row, t, canEdit, selected, onDragStart, onDragEnd, onClick }) {
  const locked = row.status !== 'PENDING'
  const draggable = canEdit && !locked
  const prio = PRIORITY_BADGE[row.priority]?.color ?? 'var(--text-muted)'
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.stopPropagation()
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', row._id) // Firefox 드래그 시작 보장
        onDragStart(row._id)
      } : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={draggable ? (e) => { e.stopPropagation(); onClick(row._id) } : undefined}
      className={`relative rounded-lg border bg-base pl-3 pr-2 py-2 flex flex-col gap-1 transition-all
        ${locked ? 'opacity-60' : draggable ? 'cursor-grab active:cursor-grabbing hover-bg-elevated' : ''}
        ${selected ? 'border-accent ring-1 ring-accent' : 'border-theme'}`}
    >
      {/* 우선순위 스트라이프 */}
      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: prio }} />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted tabular-nums truncate">{row.order_id}</span>
        <Badge value={row.type} map={TYPE_BADGE} />
      </div>
      <div className="text-sm font-medium text-primary truncate">{row.product_name}</div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="tabular-nums text-secondary">{(row.quantity || 0).toLocaleString()} {row.unit}</span>
        <span className="tabular-nums truncate">{row.planned_start} ~ {row.planned_end}</span>
      </div>
      {locked && (
        <div className="flex items-center gap-1 text-[11px] text-accent">
          <Lock size={11} /> {t('wa.locked')}
        </div>
      )}
    </div>
  )
}

// ── 저장 상태 토스트 ──────────────────────────────────────
function StatusToast({ toast, t }) {
  if (!toast) return null
  const map = {
    saving: { text: t('wa.saving'), cls: 'text-muted' },
    saved:  { text: t('wa.saved'),  cls: 'text-success' },
    error:  { text: t('wa.saveFail'), cls: 'text-danger' },
  }
  const c = map[toast.type]
  return (
    <span className={`text-sm inline-flex items-center gap-1.5 ${c.cls}`}>
      {toast.type === 'saving' && <RefreshCw size={13} className="animate-spin" />}
      {c.text}
    </span>
  )
}
