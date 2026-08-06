// LOT 추적 페이지 - 2026-05-25
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Pencil, Trash2, ScanLine } from 'lucide-react'
import QRCodeLib from 'qrcode'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import Modal  from '../../../components/containers/Modal'
import Badge  from '../../../components/common/Badge'
import QrScanner from '../../../components/common/QrScanner'
import { Field, Input, Select, Textarea, PageTitle } from '../../../components/common/FormControls'
import { API_BASE } from '../../../constants/api'

const LOT_API   = `${API_BASE}/api/lots`
const ITEMS_API = `${API_BASE}/api/items`
const EMP_API   = `${API_BASE}/api/master?category=employee`

// QR 조회 URL의 기준 주소 — 배포 주소(VITE_PUBLIC_BASE) 우선, 없으면 현재 접속 주소 - 2026-08-02
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE || window.location.origin
const lotPublicUrl = (lotNo) => `${PUBLIC_BASE}/#/m/lot/${encodeURIComponent(lotNo)}`

// 스캔 결과(URL 또는 LOT번호)에서 LOT번호 추출 — /m/lot/{lotNo} 패턴 우선 - 2026-08-02
const parseScannedLot = (text) => {
  const s = String(text ?? '').trim()
  const m = s.match(/\/m\/lot\/([^/?#]+)/)
  if (m) { try { return decodeURIComponent(m[1]) } catch { return m[1] } }
  return s
}

const LOT_STATUSES = ['ALL', 'CREATED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']
const LOG_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']

const LOT_STATUS_BADGE = {
  CREATED:     { labelKey: 'lot.status.CREATED',     color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  IN_PROGRESS: { labelKey: 'lot.status.IN_PROGRESS', color: 'var(--accent)',         bg: 'var(--accent-subtle)' },
  COMPLETED:   { labelKey: 'lot.status.COMPLETED',   color: 'var(--success)',        bg: 'rgba(74,222,128,0.1)' },
  ON_HOLD:     { labelKey: 'lot.status.ON_HOLD',     color: 'var(--warning)',        bg: 'rgba(251,191,36,0.1)' },
}

const LOG_STATUS_COLOR = {
  PENDING:     { color: 'var(--text-muted)',     bg: 'var(--bg-elevated)' },
  IN_PROGRESS: { color: 'var(--accent)',         bg: 'var(--accent-subtle)' },
  COMPLETED:   { color: 'var(--success)',        bg: 'rgba(74,222,128,0.1)' },
  SKIPPED:     { color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
}

const initFilters = { status: 'ALL', lot_no: '' }
const initLotForm = { status: '', note: '' }
const initLogForm = { status: 'PENDING', worker_code: '', actual_qty: '', defect_qty: '', note: '' }

export default function LotTrackingPage() {
  const { t }       = useLanguage()
  const { actions } = useAuth()

  const [filters,     setFilters]     = useState(initFilters)
  const [lots,        setLots]        = useState([])
  const [loading,     setLoading]     = useState(false)
  const [selectedLot, setSelectedLot] = useState(null)
  const [detail,      setDetail]      = useState(null)
  const [detailLoad,  setDetailLoad]  = useState(false)

  const [modal,   setModal]   = useState(null)
  const [lotForm, setLotForm] = useState(initLotForm)
  const [logForm, setLogForm] = useState(initLogForm)
  const [editLog, setEditLog] = useState(null)
  const [saving,  setSaving]  = useState(false)

  const [scanOpen, setScanOpen] = useState(false) // 앱 내장 QR 스캐너 - 2026-08-02

  const [products, setProducts] = useState([])
  const [empOpts,  setEmpOpts]  = useState([])

  useEffect(() => {
    fetch(`${ITEMS_API}?active_only=true`)
      .then(r => r.json())
      .then(j => setProducts((j.data ?? []).filter(i => ['FINISHED', 'SEMI'].includes(i.item_type))))
      .catch(() => {})
    fetch(EMP_API)
      .then(r => r.json())
      .then(j => setEmpOpts(j.data ?? []))
      .catch(() => {})
    handleSearch(initFilters, true)
  }, [])

  const handleSearch = useCallback(async (f = filters, autoSelect = false) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.status !== 'ALL') p.set('status',  f.status)
      if (f.lot_no)           p.set('lot_no',  f.lot_no)
      const res  = await fetch(`${LOT_API}?${p}`)
      const json = await res.json()
      const data = json.data ?? []
      setLots(data)
      if (autoSelect && data.length > 0) {
        setSelectedLot(data[0])
        loadDetail(data[0].lot_no)
      }
    } catch { setLots([]) }
    finally  { setLoading(false) }
  }, [filters])

  const loadDetail = useCallback(async (lot_no) => {
    setDetailLoad(true)
    try {
      const res  = await fetch(`${LOT_API}/${lot_no}/detail`)
      const json = await res.json()
      setDetail(json)
    } catch { setDetail(null) }
    finally  { setDetailLoad(false) }
  }, [])

  const handleSelectLot = (lot) => {
    setSelectedLot(lot)
    loadDetail(lot.lot_no)
  }

  // QR 스캔 결과 처리 — LOT번호 추출 후 해당 LOT 검색·선택 - 2026-08-02
  const handleScanDetected = useCallback((text) => {
    const lotNo = parseScannedLot(text)
    setScanOpen(false)
    const f = { status: 'ALL', lot_no: lotNo }
    setFilters(f)
    handleSearch(f, true)
  }, [handleSearch])

  const openEditLot = () => {
    setLotForm({ status: selectedLot.status, note: selectedLot.note ?? '' })
    setModal('edit-lot')
  }

  const handleSaveLot = async () => {
    setSaving(true)
    try {
      const updates = {}
      if (lotForm.status) updates.status = lotForm.status
      if (lotForm.note !== undefined) updates.note = lotForm.note
      const res = await fetch(`${LOT_API}/${selectedLot.lot_no}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
      })
      if (!res.ok) { alert('저장 실패'); return }
      setModal(null)
      handleSearch()
      loadDetail(selectedLot.lot_no)
    } finally { setSaving(false) }
  }

  const handleDeleteLot = async (lot) => {
    if (!confirm(`[${lot.lot_no}] LOT를 삭제하시겠습니까?`)) return
    await fetch(`${LOT_API}/${lot.lot_no}`, { method: 'DELETE' })
    if (selectedLot?.lot_no === lot.lot_no) { setSelectedLot(null); setDetail(null) }
    handleSearch()
  }

  const openEditLog = (log) => {
    setLogForm({
      status:      log.status,
      worker_code: log.worker_code ?? '',
      actual_qty:  log.actual_qty  ?? '',
      defect_qty:  log.defect_qty  ?? '',
      note:        log.note        ?? '',
    })
    setEditLog(log)
    setModal('edit-log')
  }

  const handleSaveLog = async () => {
    setSaving(true)
    try {
      const body = { ...logForm }
      if (body.actual_qty !== '') body.actual_qty = Number(body.actual_qty)
      else delete body.actual_qty
      if (body.defect_qty !== '') body.defect_qty = Number(body.defect_qty)
      else delete body.defect_qty
      const res = await fetch(`${LOT_API}/${selectedLot.lot_no}/logs/${editLog._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) { alert('저장 실패'); return }
      setModal(null)
      loadDetail(selectedLot.lot_no)
      handleSearch()
    } finally { setSaving(false) }
  }

  const filteredLots = useMemo(() => {
    const { status, lot_no } = filters
    return lots.filter(l => {
      if (status !== 'ALL' && l.status !== status) return false
      if (lot_no && !l.lot_no.toLowerCase().includes(lot_no.toLowerCase()) &&
          !l.product_name.toLowerCase().includes(lot_no.toLowerCase())) return false
      return true
    })
  }, [lots, filters])

  const setF  = (key) => (e) => setLotForm(p => ({ ...p, [key]: e.target.value }))
  const setLF = (key) => (e) => setLogForm(p => ({ ...p, [key]: e.target.value }))

  return (
    // 모바일/세로: 상하 스택 + 페이지 전체 스크롤(공정 이력 잘림 방지), md 이상: 좌우 2단 분할 - 2026-07-28
    <div className="h-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">

      {/* ── 왼쪽(모바일 상단): LOT 목록 패널 ── */}
      <div className="w-full md:w-72 h-64 md:h-auto flex flex-col border-b md:border-b-0 md:border-r border-theme overflow-hidden shrink-0">
        {/* 헤더 + 필터 */}
        <div className="p-4 border-b border-theme shrink-0">
          <PageTitle title={t('lot.title')} />
          <div className="mt-2 flex gap-1.5">
            <input
              value={filters.lot_no}
              onChange={e => setFilters(p => ({ ...p, lot_no: e.target.value }))}
              placeholder="LOT번호 / 품목명 검색..."
              className="flex-1 min-w-0 text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary"
            />
            {/* 앱 내장 QR 스캐너 열기 - 2026-08-02 */}
            <button onClick={() => setScanOpen(true)} title="QR 스캔" aria-label="QR 스캔"
              className="shrink-0 flex items-center justify-center w-9 rounded-md border border-theme text-muted hover-text-accent hover-bg-elevated transition-colors cursor-pointer">
              <ScanLine size={16} />
            </button>
          </div>
          <div className="mt-2 flex gap-1 flex-wrap">
            {LOT_STATUSES.map(s => (
              <button key={s} onClick={() => setFilters(p => ({ ...p, status: s }))}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer
                  ${filters.status === s
                    ? 'bg-accent text-white'
                    : 'border border-theme text-muted hover-bg-elevated'}`}>
                {s === 'ALL' ? t('opt.all') : t(`lot.status.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* LOT 리스트 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-xs text-muted">로딩 중...</p>
          ) : filteredLots.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted">LOT 없음</p>
          ) : (
            filteredLots.map(lot => (
              <LotListItem
                key={lot.lot_no}
                lot={lot}
                selected={selectedLot?.lot_no === lot.lot_no}
                onClick={() => handleSelectLot(lot)}
                onDelete={actions.delete ? () => handleDeleteLot(lot) : undefined}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 오른쪽(모바일 하단): LOT 상세 패널 ── 모바일은 자연 높이(페이지 스크롤), md 이상은 내부 스크롤 */}
      <div className="md:flex-1 flex flex-col overflow-visible md:overflow-hidden md:min-h-0">
        {selectedLot && (detail || detailLoad) ? (
          detailLoad ? (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">로딩 중...</div>
          ) : detail ? (
            <LotDetailPanel
              lot={detail.lot}
              logs={detail.process_logs}
              productions={detail.productions}
              inspections={detail.inspections}
              canEdit={actions.edit}
              onEditLot={openEditLot}
              onEditLog={openEditLog}
              t={t}
            />
          ) : null
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted text-sm">좌측 목록에서 LOT를 선택하세요</p>
          </div>
        )}
      </div>

      {/* ── LOT 상태 수정 모달 ── */}
      <Modal
        open={modal === 'edit-lot'} onClose={() => setModal(null)}
        title="LOT 상태 수정" size="sm"
        footer={
          <>
            <button onClick={() => setModal(null)}
              className="px-4 py-1.5 rounded-md text-sm border border-theme text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer">
              {t('btn.cancel')}
            </button>
            <button onClick={handleSaveLot} disabled={saving}
              className="px-4 py-1.5 rounded-md text-sm bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer">
              {saving ? t('msg.saving') : t('btn.save')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="LOT 상태">
            <Select value={lotForm.status} onChange={setF('status')}
              options={['CREATED','IN_PROGRESS','COMPLETED','ON_HOLD'].map(s => ({
                value: s, label: t(`lot.status.${s}`)
              }))} />
          </Field>
          <Field label="비고"><Textarea value={lotForm.note} onChange={setF('note')} /></Field>
        </div>
      </Modal>

      {/* ── 공정 로그 수정 모달 ── */}
      <Modal
        open={modal === 'edit-log'} onClose={() => setModal(null)}
        title={`공정 수정: ${editLog?.process_name ?? ''}`} size="sm"
        footer={
          <>
            <button onClick={() => setModal(null)}
              className="px-4 py-1.5 rounded-md text-sm border border-theme text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer">
              {t('btn.cancel')}
            </button>
            <button onClick={handleSaveLog} disabled={saving}
              className="px-4 py-1.5 rounded-md text-sm bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer">
              {saving ? t('msg.saving') : t('btn.save')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="공정 상태">
            <Select value={logForm.status} onChange={setLF('status')}
              options={LOG_STATUSES.map(s => ({ value: s, label: t(`lot.log.${s}`) }))} />
          </Field>
          <Field label="작업자">
            <Select value={logForm.worker_code} onChange={setLF('worker_code')}
              options={[{ value: '', label: '선택' }, ...empOpts.map(e => ({ value: e.code, label: e.name }))]} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="실적수량">
              <Input type="number" value={logForm.actual_qty} onChange={setLF('actual_qty')} />
            </Field>
            <Field label="불량수량">
              <Input type="number" value={logForm.defect_qty} onChange={setLF('defect_qty')} />
            </Field>
          </div>
          <Field label="비고"><Textarea value={logForm.note} onChange={setLF('note')} /></Field>
        </div>
      </Modal>

      {/* ── 앱 내장 QR 스캐너 ── */}
      <QrScanner open={scanOpen} onClose={() => setScanOpen(false)} onDetected={handleScanDetected} />
    </div>
  )
}


// ── LOT 목록 아이템 ─────────────────────────────────────────
function LotListItem({ lot, selected, onClick, onDelete, t }) {
  const statusCfg = {
    CREATED:     { color: 'var(--text-secondary)', dot: '#9ca3af' },
    IN_PROGRESS: { color: 'var(--accent)',         dot: 'var(--accent)' },
    COMPLETED:   { color: 'var(--success)',        dot: 'var(--success)' },
    ON_HOLD:     { color: 'var(--warning)',        dot: 'var(--warning)' },
  }[lot.status] ?? { color: 'var(--text-muted)', dot: '#9ca3af' }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-theme transition-colors cursor-pointer group
        ${selected ? 'bg-accent-subtle' : 'hover-bg-elevated'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusCfg.dot }} />
            <span className={`text-xs font-semibold truncate ${selected ? '' : ''}`}
              style={selected ? { color: 'var(--accent)' } : { color: 'var(--text-primary)' }}>
              {lot.lot_no}
            </span>
          </div>
          <div className="text-xs text-muted mt-0.5 truncate pl-3.5">{lot.product_name}</div>
          <div className="text-xs mt-1 pl-3.5" style={{ color: statusCfg.color }}>
            {t(`lot.status.${lot.status}`)} · {lot.opened_at}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded text-muted hover-text-danger hover-bg-elevated transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </button>
  )
}


// ── LOT 상세 패널 ─────────────────────────────────────────
function LotDetailPanel({ lot, logs, productions, inspections, canEdit, onEditLot, onEditLog, t }) {
  const reversedLogs = [...logs].sort((a, b) => b.sequence - a.sequence)

  // 이 LOT의 공개 조회 URL을 QR 이미지로 생성 — 상세 헤더에 인라인 표시 - 2026-08-02
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const lotUrl = lotPublicUrl(lot.lot_no)
  useEffect(() => {
    let cancelled = false
    QRCodeLib.toDataURL(lotUrl, { width: 240, margin: 2 })
      .then((d) => { if (!cancelled) setQrDataUrl(d) })
      .catch(() => { if (!cancelled) setQrDataUrl(null) })
    return () => { cancelled = true }
  }, [lotUrl])

  const lastDoneLog = [...logs].sort((a,b) => b.sequence - a.sequence).find(l => l.good_qty != null)
  const yieldPct    = lastDoneLog && lot.planned_qty > 0
    ? ((lastDoneLog.good_qty / lot.planned_qty) * 100).toFixed(1)
    : null

  const ascending    = [...logs].sort((a, b) => a.sequence - b.sequence)
  const firstStarted = ascending.find(l => l.started_at)?.started_at
  const lastDone     = [...ascending].reverse().find(l => l.completed_at)?.completed_at
  const fmtTime = (iso) => {
    if (!iso) return null
    const m = String(iso).match(/T(\d{2}:\d{2})/) || String(iso).match(/(\d{2}:\d{2})/)
    return m ? m[1] : iso.slice(0, 10)
  }
  const periodStr = firstStarted
    ? `${lot.opened_at} ${fmtTime(firstStarted) ?? ''}${lastDone ? ` ~ ${fmtTime(lastDone)}` : ''}`
    : lot.opened_at

  return (
    <div className="flex flex-col md:h-full overflow-visible md:overflow-hidden">
      {/* ── 헤더 카드 ── */}
      <div className="mx-5 mt-5 mb-4 rounded-2xl p-5 shrink-0"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-subtle)' }}>
              완제품 LOT
            </span>
            <h2 className="text-lg font-bold text-primary tracking-tight">{lot.lot_no}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge value={lot.status} map={LOT_STATUS_BADGE} />
            {canEdit && (
              <button onClick={onEditLot}
                className="p-1.5 rounded-md text-muted hover-text-accent hover-bg-elevated transition-colors cursor-pointer border border-theme">
                <Pencil size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          {/* 왼쪽: LOT 정보 그리드 */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-xs">
              <HeaderInfo label="품번"     value={lot.product_code} />
              <HeaderInfo label="품명"     value={lot.product_name} />
              <HeaderInfo label="지시번호" value={lot.order_id} />
              <HeaderInfo label="완료일"   value={lot.closed_at ?? '-'} />
            </div>
            <div className="mt-3 pt-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-xs"
              style={{ borderTop: '1px dashed var(--border)' }}>
              <HeaderInfo label="수량"     value={`${lot.planned_qty} EA`} />
              <HeaderInfo label="수율"     value={yieldPct != null ? `${yieldPct}%` : '-'} accent={yieldPct != null} />
              <HeaderInfo label="생산기간" value={periodStr} />
            </div>
          </div>
          {/* 오른쪽: 모바일 조회 QR — 스캔 시 공개 LOT 조회 페이지로 이동 - 2026-08-02 */}
          <div className="shrink-0 flex items-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`${lot.lot_no} QR`} width={92} height={92}
                className="rounded-lg border border-theme bg-white p-1.5" />
            ) : (
              <div className="w-23 h-23 rounded-lg border border-theme bg-elevated" />
            )}
          </div>
        </div>
        {lot.note && <div className="mt-3 text-xs text-muted">{lot.note}</div>}
      </div>

      {/* ── 공정 이력 (역순) ── 모바일은 자연 높이(페이지 스크롤), md 이상은 내부 스크롤 */}
      <div className="md:flex-1 md:overflow-y-auto md:min-h-0 px-5 pb-6">
        <div className="text-sm font-semibold text-primary mb-4">
          공정 이력 <span className="text-xs font-normal text-muted">(역순 추적)</span>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">등록된 공정이 없습니다.</p>
        ) : (
          <div className="flex flex-col">
            {reversedLogs.map((log, idx) => (
              <TimelineRow
                key={log._id}
                log={log}
                isLast={idx === reversedLogs.length - 1}
                canEdit={canEdit}
                onEdit={onEditLog}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HeaderInfo({ label, value, accent }) {
  return (
    <div>
      <div className="text-muted mb-0.5">{label}</div>
      <div className="font-semibold truncate"
        style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

function TimelineRow({ log, isLast, canEdit, onEdit, t }) {
  const isDone    = log.status === 'COMPLETED'
  const isActive  = log.status === 'IN_PROGRESS'
  const isSkipped = log.status === 'SKIPPED'
  const circleBg  = isDone ? 'var(--success)' : isActive ? 'var(--accent)' : isSkipped ? '#9ca3af' : '#9ca3af'

  const fmtTime = (iso) => {
    if (!iso) return null
    const m = String(iso).match(/T(\d{2}:\d{2})/) || String(iso).match(/(\d{2}:\d{2})/)
    return m ? m[1] : null
  }
  const timeStr = (log.started_at || log.completed_at)
    ? [fmtTime(log.started_at), fmtTime(log.completed_at)].filter(Boolean).join(' ~ ')
    : null

  return (
    <div className="flex gap-4">
      {/* 왼쪽: 원 + 수직선 */}
      <div className="flex flex-col items-center" style={{ width: 32 }}>
        <div className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
          style={{ background: circleBg }}>
          {log.sequence}
        </div>
        {!isLast && (
          <div className="flex-1 w-px mt-1" style={{ background: 'var(--border)', minHeight: 16 }} />
        )}
      </div>

      {/* 오른쪽: 카드 */}
      <div className="flex-1 mb-3 rounded-xl border px-4 py-3 bg-surface"
        style={{ borderColor: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-primary">{log.process_name}</span>
          <div className="flex items-center gap-2 shrink-0">
            {timeStr && <span className="text-xs text-muted">⏱ {timeStr}</span>}
            {canEdit && (
              <button onClick={() => onEdit(log)}
                className="p-1 rounded text-muted hover-text-accent hover-bg-elevated transition-colors cursor-pointer">
                <Pencil size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-muted mt-0.5">{log.process_code}</div>
        {(log.worker_code || log.actual_qty != null) && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted">
            {log.worker_code && (
              <span>작업자: <b className="text-primary">{log.worker_code}</b></span>
            )}
            {log.actual_qty != null && (
              <>
                <span>투입: <b className="text-primary">{log.actual_qty}</b></span>
                <span>양품: <b className="text-primary">{log.good_qty ?? log.actual_qty}</b></span>
                {log.defect_qty > 0 && (
                  <span style={{ color: 'var(--danger)' }}>불량: <b>{log.defect_qty}</b></span>
                )}
              </>
            )}
          </div>
        )}
        {!isDone && !isSkipped && (
          <div className="mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                color:      isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
              }}>
              {t(`lot.log.${log.status}`)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
