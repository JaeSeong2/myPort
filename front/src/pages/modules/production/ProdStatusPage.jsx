// 실적 현황 - 2026-05-23
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import { PROD_STATUS, PROD_STATUS_FORM, PROD_STATUS_BADGE } from '../../../constants/production'
import SearchBar from '../../../components/containers/SearchBar'
import ActionBar from '../../../components/containers/ActionBar'
import Table     from '../../../components/containers/Table'
import Modal     from '../../../components/containers/Modal'
import { Field, Input, Select, Textarea, PageTitle } from '../../../components/common/FormControls'
import Badge     from '../../../components/common/Badge'
import { API_BASE } from '../../../constants/api'

const API        = `${API_BASE}/api/productions`
const WO_API     = `${API_BASE}/api/work-orders`
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

const initFilters = { status: 'ALL', orderId: '', productCode: 'ALL', dateRange: getMonthRange() }
const initForm    = {
  order_id: '', product_code: '', product_name: '',
  planned_qty: '', actual_qty: '', defect_qty: '0',
  process_code: '', worker_code: '',
  work_date: '', start_time: '', end_time: '', note: '',
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

  const searchFields = useMemo(() => [
    { key: 'status',      label: t('prod.status'),      type: 'select',
      options: PROD_STATUS.map(o => ({ value: o.value, label: o.value === 'ALL' ? t('opt.all') : t(`opt.prod.${o.value}`) })) },
    { key: 'orderId',     label: t('prod.orderId'),     type: 'text' },
    { key: 'productCode', label: t('prod.productCode'), type: 'select',
      optionsFrom: `${API_BASE}/api/items` },
    { key: 'dateRange',   label: t('prod.dateRange'),   type: 'daterange' },
  ], [t])

  const columns = useMemo(() => [
    { key: 'prod_id',      label: t('prod.prodId'),      width: 160 },
    { key: 'order_id',     label: t('prod.orderId'),     width: 160 },
    { key: 'product_code', label: t('prod.productCode'), width: 100 },
    { key: 'product_name', label: t('prod.productName'), width: 160 },
    { key: 'planned_qty',  label: t('prod.plannedQty'),  width: 80,
      render: (r) => `${r.planned_qty} ${r.unit ?? ''}` },
    { key: 'actual_qty',   label: t('prod.actualQty'),   width: 80,
      render: (r) => r.actual_qty },
    { key: 'defect_qty',   label: t('prod.defectQty'),   width: 80,
      render: (r) => r.defect_qty ?? 0 },
    { key: 'good_qty',     label: t('prod.goodQty'),     width: 80,
      render: (r) => r.good_qty ?? 0 },
    { key: 'work_date',    label: t('prod.workDate'),    width: 100 },
    { key: 'worker_code',  label: t('prod.worker'),      width: 80 },
    { key: 'status',       label: t('prod.status'),      width: 80,
      render: (r) => <Badge value={r.status} map={PROD_STATUS_BADGE} /> },
    ...(actions.edit || actions.delete ? [{
      key: 'actions', label: '', width: 72,
      render: (r) => (
        <div className="flex gap-1">
          {actions.edit && r.status !== 'COMPLETED' && (
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
  ], [t, actions])

  const handleSearch = useCallback(async (f = filters) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.status      !== 'ALL') p.set('status',       f.status)
      if (f.orderId)               p.set('order_id',     f.orderId)
      if (f.productCode !== 'ALL') p.set('product_code', f.productCode)
      if (f.dateRange[0])          p.set('start_date',   f.dateRange[0])
      if (f.dateRange[1])          p.set('end_date',     f.dateRange[1])
      const res  = await fetch(`${API}?${p}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } catch { setRows([]) }
    finally  { setLoading(false) }
  }, [filters])

  useEffect(() => { handleSearch(initFilters) }, [])

  const openCreate = () => {
    setForm({ ...initForm, work_date: fmtDate(new Date()) })
    setEditRow(null)
    setModal('create')
  }
  const openEdit = (row) => {
    setForm({
      order_id: row.order_id, product_code: row.product_code, product_name: row.product_name,
      planned_qty: row.planned_qty, actual_qty: row.actual_qty, defect_qty: row.defect_qty ?? 0,
      process_code: row.process_code ?? '', worker_code: row.worker_code ?? '',
      work_date: row.work_date, start_time: row.start_time ?? '', end_time: row.end_time ?? '',
      note: row.note ?? '', status: row.status,
    })
    setEditRow(row)
    setModal('edit')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal === 'edit'
      const body   = {
        ...form,
        planned_qty: Number(form.planned_qty),
        actual_qty:  Number(form.actual_qty),
        defect_qty:  Number(form.defect_qty),
      }
      const res = await fetch(isEdit ? `${API}/${editRow._id}` : API, {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) return
      setModal(null)
      handleSearch()
    } finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`[${row.prod_id}] 를 삭제하시겠습니까?`)) return
    await fetch(`${API}/${row._id}`, { method: 'DELETE' })
    handleSearch()
  }

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <PageTitle title={t('prod.title')} />

      <SearchBar
        fields={searchFields} filters={filters}
        onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
      />

      <ActionBar
        onSearch={() => handleSearch()}
        onAdd={actions.add ? openCreate : undefined}
      />

      <Table
        columns={columns} data={rows} loading={loading}
        emptyText={t('msg.noData')}
        onRowDoubleClick={actions.edit ? openEdit : undefined}
      />

      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={t(modal === 'edit' ? 'prod.edit.title' : 'prod.create.title')}
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
        <FormGrid form={form} setForm={setForm} modal={modal} t={t} />
      </Modal>
    </div>
  )
}

// ── 입력 폼 ───────────────────────────────────────────────
function FormGrid({ form, setForm, modal, t }) {
  const [woOpts,      setWoOpts]      = useState([])
  const [processOpts, setProcessOpts] = useState([])
  const [empOpts,     setEmpOpts]     = useState([])

  useEffect(() => {
    // 진행 가능한 작업지시 (PENDING + IN_PROG)
    Promise.all([
      fetch(`${WO_API}?status=PENDING`).then(r => r.json()),
      fetch(`${WO_API}?status=IN_PROG`).then(r => r.json()),
    ]).then(([p, i]) => setWoOpts([...(p.data ?? []), ...(i.data ?? [])]))
      .catch(() => {})

    const loadMaster = (cat, setter) =>
      fetch(`${MASTER_API}?category=${cat}&active_only=true`)
        .then(r => r.json()).then(j => setter(j.data ?? [])).catch(() => {})
    loadMaster('process',  setProcessOpts)
    loadMaster('employee', setEmpOpts)
  }, [])

  const handleWoSelect = (e) => {
    const wo = woOpts.find(o => o.order_id === e.target.value)
    if (!wo) return
    setForm(p => ({
      ...p,
      order_id:     wo.order_id,
      product_code: wo.product_code,
      product_name: wo.product_name,
      planned_qty:  wo.quantity,
    }))
  }

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const goodQty = Math.max(0, Number(form.actual_qty || 0) - Number(form.defect_qty || 0))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      {/* 작업지시 선택 */}
      {modal === 'create' ? (
        <Field label={t('prod.orderId')} className="col-span-2">
          <Select value={form.order_id} onChange={handleWoSelect}
            options={[{ value: '', label: '선택' },
              ...woOpts.map(o => ({ value: o.order_id, label: `${o.order_id} | ${o.product_name}` }))]} />
        </Field>
      ) : (
        <Field label={t('prod.orderId')} className="col-span-2">
          <Input value={form.order_id} readOnly />
        </Field>
      )}

      <Field label={t('prod.productCode')}>
        <Input value={form.product_code} readOnly />
      </Field>
      <Field label={t('prod.productName')}>
        <Input value={form.product_name} readOnly />
      </Field>

      <Field label={t('prod.plannedQty')}>
        <Input type="number" value={form.planned_qty} readOnly />
      </Field>
      <Field label={t('prod.actualQty')}>
        <Input type="number" value={form.actual_qty} onChange={setF('actual_qty')} />
      </Field>

      <Field label={t('prod.defectQty')}>
        <Input type="number" value={form.defect_qty} onChange={setF('defect_qty')} />
      </Field>
      <Field label={t('prod.goodQty')}>
        <Input type="number" value={goodQty} readOnly />
      </Field>

      <Field label={t('prod.workDate')}>
        <Input type="date" value={form.work_date} onChange={setF('work_date')} />
      </Field>
      <Field label={t('prod.processCode')}>
        <Select value={form.process_code} onChange={setF('process_code')}
          options={[{ value: '', label: '선택' }, ...processOpts.map(o => ({ value: o.code, label: `${o.code} ${o.name}` }))]} />
      </Field>

      <Field label={t('prod.worker')}>
        <Select value={form.worker_code} onChange={setF('worker_code')}
          options={[{ value: '', label: '선택' }, ...empOpts.map(o => ({ value: o.code, label: o.name }))]} />
      </Field>
      <Field label={`${t('prod.startTime')} ~ ${t('prod.endTime')}`}>
        <div className="flex gap-2">
          <input type="time" value={form.start_time} onChange={setF('start_time')}
            className="text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary w-full" />
          <input type="time" value={form.end_time} onChange={setF('end_time')}
            className="text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary w-full" />
        </div>
      </Field>

      {/* 완료 처리 (수정 시에만) */}
      {modal === 'edit' && form.status !== 'COMPLETED' && (
        <Field label={t('prod.status')}>
          <Select value={form.status ?? 'ONGOING'} onChange={setF('status')}
            options={PROD_STATUS_FORM.map(o => ({ value: o.value, label: t(`opt.prod.${o.value}`) }))} />
        </Field>
      )}
      {modal === 'edit' && form.status === 'COMPLETED' && (
        <Field label={t('prod.status')}>
          <Input value={t('opt.prod.COMPLETED')} readOnly />
        </Field>
      )}

      <Field label={t('prod.note')} className={modal === 'edit' ? '' : 'col-span-2'}>
        <Textarea value={form.note} onChange={setF('note')} />
      </Field>
    </div>
  )
}

