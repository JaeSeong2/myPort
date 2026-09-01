// 작업지시 현황 - 2026-05-24
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Pencil, Trash2, Play } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import { WO_STATUS_FORM, WO_TYPE_FORM, WO_PRIORITY_FORM } from '../../../constants/workOrder'
import SearchBar  from '../../../components/containers/SearchBar'
import ActionBar  from '../../../components/containers/ActionBar'
import Table      from '../../../components/containers/Table'
import Modal      from '../../../components/containers/Modal'
import { Field, Input, Select, Textarea, ItemSelect, PageTitle } from '../../../components/common/FormControls'
import Badge, { STATUS_BADGE, TYPE_BADGE } from '../../../components/common/Badge'
import { exportToExcel, parseExcelFile } from '../../../utils/excel'
import { probeMonthRange } from '../../../utils/effectiveMonth'
import { API_BASE } from '../../../constants/api'

const API        = `${API_BASE}/api/work-orders`
const LOT_API    = `${API_BASE}/api/lots`
const MASTER_API = `${API_BASE}/api/master`

const fmtDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getMonthRange = () => {
  const now = new Date()
  return [
    fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  ]
}

const initFilters = { status: 'ALL', type: 'ALL', productCode: 'ALL', dateRange: getMonthRange() }
const initForm    = {
  type: 'NORMAL', priority: 'MEDIUM',
  product_code: '', product_name: '',
  quantity: '', unit: 'EA',
  planned_start: '', planned_end: '',
  assignee: '', process_code: '', note: '',
}

export default function StatusPage() {
  const { t } = useLanguage()
  const { actions } = useAuth()

  const [filters, setFilters] = useState(initFilters)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [form,    setForm]    = useState(initForm)
  const [saving,  setSaving]  = useState(false)
  const [empMap,  setEmpMap]  = useState({})  // 담당자 코드→이름 (배정 화면과 표시 통일) - 2026-09-01

  // 작업자 마스터 로드 → 담당자 컬럼을 이름으로 표시(작업 배정 보드와 연동 표시)
  useEffect(() => {
    fetch(`${MASTER_API}?category=employee&active_only=true`)
      .then(r => r.json())
      .then(j => setEmpMap(Object.fromEntries((j.data ?? []).map(e => [e.code, e.name]))))
      .catch(() => {})
  }, [])

  // 조건검색 필드 - 상태/유형은 하드코드, 품목코드는 기초정보 DB에서 로드
  const searchFields = useMemo(() => [
    { key: 'status',      label: t('wo.status'),      type: 'select',
      options: [{ value: 'ALL', label: t('opt.all') }, ...WO_STATUS_FORM.map(o => ({ value: o.value, label: t(`opt.status.${o.value}`) }))] },
    { key: 'type',        label: t('wo.type'),        type: 'select',
      options: [{ value: 'ALL', label: t('opt.all') }, ...WO_TYPE_FORM.map(o => ({ value: o.value, label: t(`opt.type.${o.value}`) }))] },
    { key: 'productCode', label: t('wo.productCode'), type: 'select',
      optionsFrom: `${API_BASE}/api/items` },
    { key: 'dateRange',   label: t('wo.dateRange'),   type: 'daterange' },
  ], [t])

  // 테이블 컬럼
  const columns = useMemo(() => [
    { key: 'order_id',     label: t('wo.orderId'),     width: 160 },
    { key: 'type',         label: t('wo.type'),         width: 90,
      render: (r) => <Badge value={r.type}   map={TYPE_BADGE} /> },
    { key: 'status',       label: t('wo.status'),       width: 80,
      render: (r) => <Badge value={r.status} map={STATUS_BADGE} /> },
    { key: 'product_code', label: t('wo.productCode'),  width: 110 },
    { key: 'product_name', label: t('wo.productName'),  width: 160 },
    { key: 'qty',          label: t('wo.quantity'),     width: 90,
      render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'planned',      label: t('wo.period'),       width: 200,
      render: (r) => `${r.planned_start} ~ ${r.planned_end}` },
    { key: 'assignee',     label: t('wo.assignee'),     width: 90,
      render: (r) => empMap[r.assignee] ?? r.assignee ?? '-' },
    ...(actions.add || actions.edit || actions.delete ? [{
      key: 'actions', label: '', width: 96,
      render: (r) => (
        <div className="flex gap-1">
          {actions.add && ['PENDING', 'IN_PROG'].includes(r.status) && (
            <button onClick={() => handleStartLot(r)} title="착수"
              className="p-1 rounded text-muted hover-text-accent hover-bg-elevated transition-colors cursor-pointer">
              <Play size={13} />
            </button>
          )}
          {actions.edit && (
            <button onClick={() => openEdit(r)}
              className="p-1 rounded text-muted hover-text-accent hover-bg-elevated transition-colors cursor-pointer">
              <Pencil size={13} />
            </button>
          )}
          {actions.delete && (
            <button onClick={() => handleDelete(r)}
              className="p-1 rounded text-muted hover-text-danger hover-bg-elevated transition-colors cursor-pointer">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    }] : []),
  ], [t, actions, empMap])

  // ── 조회 ──────────────────────────────────────────────
  const handleSearch = useCallback(async (f = filters) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.status      !== 'ALL') p.set('status',       f.status)
      if (f.type        !== 'ALL') p.set('type',         f.type)
      if (f.productCode !== 'ALL') p.set('product_code', f.productCode)
      if (f.dateRange[0])          p.set('start_date',   f.dateRange[0])
      if (f.dateRange[1])          p.set('end_date',     f.dateRange[1])
      const res  = await fetch(`${API}?${p}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } catch { setRows([]) }
    finally  { setLoading(false) }
  }, [filters])

  // 최초 진입: 데이터 있는 최신월로 기본 조회(월 이월 — 대시보드와 통일) - 2026-09-01
  useEffect(() => {
    (async () => {
      const dateRange = await probeMonthRange(API, 'planned_start')
      const f = { ...initFilters, dateRange }
      setFilters(f)
      handleSearch(f)
    })()
  }, [])

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const handleExcelDownload = () => {
    exportToExcel(columns, rows, '작업지시현황')
  }

  const handleExcelUpload = async (file) => {
    try {
      const { rows: parsed, matched, skipped } = await parseExcelFile(file, columns)

      if (!parsed.length) { alert('업로드할 데이터가 없습니다.'); return }

      const confirmMsg = [
        `${parsed.length}행을 업로드합니다.`,
        `매칭 컬럼: ${matched.join(', ')}`,
        skipped.length ? `제외 컬럼: ${skipped.join(', ')}` : '',
        '',
        '계속하시겠습니까?',
      ].filter(Boolean).join('\n')

      if (!confirm(confirmMsg)) return

      let success = 0
      let fail    = 0

      for (const row of parsed) {
        // qty 컬럼(표시용 "100 EA")을 quantity/unit으로 분리
        const qtyStr  = String(row.qty ?? '')
        const qtyMatch = qtyStr.match(/^([\d.]+)\s*(\w+)?$/)
        const quantity = qtyMatch ? Number(qtyMatch[1]) : Number(row.quantity ?? 0)
        const unit     = qtyMatch?.[2] || row.unit || 'EA'

        // planned 컬럼(표시용 "YYYY-MM-DD ~ YYYY-MM-DD")을 start/end로 분리
        const plannedStr   = String(row.planned ?? '')
        const plannedParts = plannedStr.split('~').map(s => s.trim())
        const planned_start = plannedParts[0] || row.planned_start || ''
        const planned_end   = plannedParts[1] || row.planned_end   || ''

        const body = {
          type:          row.type          || 'NORMAL',
          priority:      row.priority      || 'MEDIUM',
          product_code:  row.product_code  || '',
          product_name:  row.product_name  || '',
          quantity,
          unit,
          planned_start,
          planned_end,
          assignee:      row.assignee      || '',
          process_code:  row.process_code  || '',
          note:          row.note          || '',
        }

        const res = await fetch(API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        if (res.ok) success++; else fail++
      }

      alert(`업로드 완료\n성공: ${success}건 / 실패: ${fail}건`)
      handleSearch()
    } catch {
      alert('파일 처리 중 오류가 발생했습니다.')
    }
  }

  const openCreate = () => {
    const today = fmtDate(new Date())
    setForm({ ...initForm, planned_start: today, planned_end: today })
    setEditRow(null)
    setModal('create')
  }
  const openEdit   = (row) => {
    setForm({
      type: row.type, priority: row.priority,
      product_code: row.product_code, product_name: row.product_name,
      quantity: row.quantity, unit: row.unit,
      planned_start: row.planned_start, planned_end: row.planned_end,
      assignee: row.assignee, process_code: row.process_code, note: row.note ?? '',
    })
    setEditRow(row)
    setModal('edit')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal === 'edit'
      const res = await fetch(isEdit ? `${API}/${editRow._id}` : API, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      })
      if (!res.ok) return
      setModal(null)
      handleSearch()
    } finally { setSaving(false) }
  }

  const handleStartLot = async (row) => {
    if (!confirm(`[${row.order_id}] ${row.product_name} 작업을 착수하시겠습니까?`)) return
    const lotRes = await fetch(LOT_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        order_id:     row.order_id,
        product_code: row.product_code,
        product_name: row.product_name,
        planned_qty:  row.quantity,
      }),
    })
    if (!lotRes.ok) { alert('착수 실패'); return }
    const lot = await lotRes.json()

    // 작업지시 상태를 진행(IN_PROG)으로 업데이트
    await fetch(`${API}/${row._id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'IN_PROG' }),
    })

    alert(`착수 완료\nLOT번호: ${lot.lot_no}`)
    handleSearch()
  }

  const handleDelete = async (row) => {
    if (!confirm(`[${row.order_id}] 를 삭제하시겠습니까?`)) return
    await fetch(`${API}/${row._id}`, { method: 'DELETE' })
    handleSearch()
  }

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <PageTitle title={t('wo.title')} />

      <SearchBar fields={searchFields} filters={filters} onChange={handleFilterChange} />

      <ActionBar
        onSearch={() => handleSearch()}
        onAdd={actions.add ? openCreate : undefined}
        onExcelUpload={actions.excel_up ? handleExcelUpload : undefined}
        onExcelDownload={actions.excel_down ? handleExcelDownload : undefined}
      />

      <Table
        columns={columns} data={rows} loading={loading}
        emptyText={t('msg.noData')}
        onRowDoubleClick={actions.edit ? openEdit : undefined}
      />

      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={t(modal === 'edit' ? 'wo.edit.title' : 'wo.create.title')}
        size="md"
        footer={
          <>
            <button onClick={() => setModal(null)}
              className="px-4 py-1.5 rounded-md text-sm border border-theme text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer">
              {t('btn.cancel')}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 rounded-md text-sm bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer">
              {saving ? t('msg.saving') : t('btn.save')}
            </button>
          </>
        }
      >
        <FormGrid form={form} setF={setF} setForm={setForm} t={t} />
      </Modal>
    </div>
  )
}

// ── 입력 폼 ───────────────────────────────────────────────
function FormGrid({ form, setF, setForm, t }) {
  const [processOpts, setProcessOpts] = useState([])
  const [empOpts,     setEmpOpts]     = useState([])

  useEffect(() => {
    const MASTER = MASTER_API
    const loadMaster = (cat, setter) =>
      fetch(`${MASTER}?category=${cat}&active_only=true`)
        .then(r => r.json())
        .then(j => setter(j.data ?? []))
        .catch(() => {})
    loadMaster('process',  setProcessOpts)
    loadMaster('employee', setEmpOpts)
  }, [])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <Field label={t('wo.type')}>
        <Select value={form.type} onChange={setF('type')}
          options={WO_TYPE_FORM.map(o => ({ value: o.value, label: t(`opt.type.${o.value}`) }))} />
      </Field>
      <Field label={t('wo.priority')}>
        <Select value={form.priority} onChange={setF('priority')}
          options={WO_PRIORITY_FORM.map(o => ({ value: o.value, label: t(`opt.priority.${o.value}`) }))} />
      </Field>
      <ItemSelect
        productCode={form.product_code}
        productName={form.product_name}
        onSelect={(item) => setForm(p => ({
          ...p,
          product_code: item?.code ?? '',
          product_name: item?.name ?? '',
          unit:         item?.unit ?? 'EA',
        }))}
        nameLabel={t('wo.productName')}
        codeLabel={t('wo.productCode')}
      />
      <Field label={t('wo.quantity')}>
        <Input type="number" value={form.quantity} onChange={setF('quantity')} />
      </Field>
      <Field label={t('wo.plannedStart')}>
        <Input type="date" value={form.planned_start} onChange={setF('planned_start')} />
      </Field>
      <Field label={t('wo.plannedEnd')}>
        <Input type="date" value={form.planned_end} onChange={setF('planned_end')} />
      </Field>
      <Field label={t('wo.assignee')}>
        <Select value={form.assignee} onChange={setF('assignee')}
          options={[{ value: '', label: '선택' }, ...empOpts.map(o => ({ value: o.code, label: `${o.name}` }))]} />
      </Field>
      <Field label={t('wo.processCode')}>
        <Select value={form.process_code} onChange={setF('process_code')}
          options={[{ value: '', label: '선택' }, ...processOpts.map(o => ({ value: o.code, label: `${o.code} ${o.name}` }))]} />
      </Field>
      <Field label={t('wo.note')} className="col-span-2">
        <Textarea value={form.note} onChange={setF('note')} />
      </Field>
    </div>
  )
}

