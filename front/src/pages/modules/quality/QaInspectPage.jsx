// 검사 현황 - 2026-05-23
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import {
  INSPECT_TYPE, INSPECT_TYPE_FORM, INSPECT_TYPE_BADGE,
  INSPECT_RESULT, INSPECT_RESULT_BADGE,
} from '../../../constants/quality'
import SearchBar  from '../../../components/containers/SearchBar'
import ActionBar  from '../../../components/containers/ActionBar'
import Table      from '../../../components/containers/Table'
import Modal      from '../../../components/containers/Modal'
import { Field, Input, Select, Textarea, ItemSelect, PageTitle } from '../../../components/common/FormControls'
import Badge      from '../../../components/common/Badge'
import { probeMonthRange } from '../../../utils/effectiveMonth'
import { API_BASE } from '../../../constants/api'

const API        = `${API_BASE}/api/quality`
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

const initFilters = {
  product_code: 'ALL',
  inspect_type: 'ALL',
  result: 'ALL',
  dateRange: getMonthRange(),
}
const initForm = {
  order_id: '', product_code: '', product_name: '',
  inspect_type: 'INCOMING', quantity: '', passed: '', failed: '0',
  inspector: '', inspect_date: '', note: '',
}

const liveResult = (passed, failed, qty) => {
  const f = Number(failed), p = Number(passed), q = Number(qty)
  if (!q || !p) return ''
  if (f === 0)               return 'PASS'
  if (f / q <= 0.05)         return 'CONDITIONAL'
  return 'FAIL'
}

export default function InspectPage() {
  const { t }       = useLanguage()
  const { actions } = useAuth()

  const [filters, setFilters] = useState(initFilters)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [form,    setForm]    = useState(initForm)
  const [saving,  setSaving]  = useState(false)

  const searchFields = useMemo(() => [
    { key: 'inspect_type', label: t('qa.inspectType'), type: 'select',
      options: INSPECT_TYPE.map(o => ({ value: o.value, label: o.value === 'ALL' ? t('opt.all') : t(`opt.inspect.${o.value}`) })) },
    { key: 'result',       label: t('qa.result'),      type: 'select',
      options: INSPECT_RESULT.map(o => ({ value: o.value, label: o.value === 'ALL' ? t('opt.all') : t(`opt.result.${o.value}`) })) },
    { key: 'product_code', label: t('qa.productName'), type: 'select',
      optionsFrom: `${API_BASE}/api/items` },
    { key: 'dateRange',    label: t('qa.dateRange'),   type: 'daterange' },
  ], [t])

  const columns = useMemo(() => [
    { key: 'inspect_id',   label: t('qa.inspectId'),   width: 160 },
    { key: 'inspect_date', label: t('qa.inspectDate'), width: 100 },
    { key: 'inspect_type', label: t('qa.inspectType'), width: 90,
      render: (r) => <Badge value={r.inspect_type} map={INSPECT_TYPE_BADGE} /> },
    { key: 'product_code', label: t('qa.productCode'), width: 100 },
    { key: 'product_name', label: t('qa.productName'),  width: 160 },
    { key: 'quantity',     label: t('qa.quantity'),    width: 80,
      render: (r) => r.quantity.toLocaleString() },
    { key: 'passed',       label: t('qa.passed'),      width: 80,
      render: (r) => <span className="text-success">{r.passed.toLocaleString()}</span> },
    { key: 'failed',       label: t('qa.failed'),      width: 80,
      render: (r) => r.failed > 0
        ? <span className="text-danger">{r.failed.toLocaleString()}</span>
        : <span className="text-muted">0</span> },
    { key: 'pass_rate',    label: t('qa.passRate'),    width: 80,
      render: (r) => `${r.pass_rate ?? 0}%` },
    { key: 'result',       label: t('qa.result'),      width: 100,
      render: (r) => <Badge value={r.result} map={INSPECT_RESULT_BADGE} /> },
    { key: 'inspector',    label: t('qa.inspector'),   width: 80 },
    ...(actions.edit || actions.delete ? [{
      key: 'actions', label: '', width: 72,
      render: (r) => (
        <div className="flex gap-1">
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
  ], [t, actions])

  const handleSearch = useCallback(async (f = filters) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.product_code && f.product_code !== 'ALL') p.set('product_code', f.product_code)
      if (f.inspect_type !== 'ALL')  p.set('inspect_type',  f.inspect_type)
      if (f.result       !== 'ALL')  p.set('result',        f.result)
      if (f.dateRange[0])            p.set('start_date',    f.dateRange[0])
      if (f.dateRange[1])            p.set('end_date',      f.dateRange[1])
      const res  = await fetch(`${API}?${p}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } catch { setRows([]) }
    finally  { setLoading(false) }
  }, [filters])

  // 최초 진입: 데이터 있는 최신월로 기본 조회(월 이월 — 대시보드와 통일) - 2026-09-01
  useEffect(() => {
    (async () => {
      const dateRange = await probeMonthRange(API, 'inspect_date')
      const f = { ...initFilters, dateRange }
      setFilters(f)
      handleSearch(f)
    })()
  }, [])

  const openCreate = () => {
    setForm({ ...initForm, inspect_date: fmtDate(new Date()) })
    setEditRow(null)
    setModal('create')
  }
  const openEdit = (row) => {
    setForm({
      order_id: row.order_id ?? '', product_code: row.product_code, product_name: row.product_name,
      inspect_type: row.inspect_type, quantity: row.quantity, passed: row.passed, failed: row.failed,
      inspector: row.inspector, inspect_date: row.inspect_date, note: row.note ?? '',
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
        quantity: Number(form.quantity),
        passed:   Number(form.passed),
        failed:   Number(form.failed),
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
    if (!confirm(`[${row.inspect_id}] 을(를) 삭제하시겠습니까?`)) return
    await fetch(`${API}/${row._id}`, { method: 'DELETE' })
    handleSearch()
  }

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <PageTitle title={t('qa.title')} />

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
        title={t(modal === 'edit' ? 'qa.edit.title' : 'qa.create.title')}
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
        <InspectForm form={form} setForm={setForm} modal={modal} t={t} />
      </Modal>
    </div>
  )
}

// ── 검사 입력 폼 ───────────────────────────────────────────
function InspectForm({ form, setForm, modal, t }) {
  const [inspectorOpts, setInspectorOpts] = useState([])

  useEffect(() => {
    fetch(`${MASTER_API}?category=employee&active_only=true`)
      .then(r => r.json()).then(j => setInspectorOpts(j.data ?? [])).catch(() => {})
  }, [])

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const preview = liveResult(form.passed, form.failed, form.quantity)
  const previewColor = preview === 'PASS' ? 'var(--success)'
    : preview === 'CONDITIONAL' ? 'var(--warning)' : preview === 'FAIL' ? 'var(--danger)' : 'var(--text-muted)'
  const previewLabel = preview === 'PASS' ? '합격'
    : preview === 'CONDITIONAL' ? '조건부합격' : preview === 'FAIL' ? '불합격' : '—'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
      <Field label={t('qa.inspectType')}>
        <Select value={form.inspect_type} onChange={setF('inspect_type')}
          options={INSPECT_TYPE_FORM.map(o => ({ value: o.value, label: t(`opt.inspect.${o.value}`) }))} />
      </Field>
      <Field label={t('qa.inspectDate')}>
        <Input type="date" value={form.inspect_date} onChange={setF('inspect_date')} />
      </Field>

      <ItemSelect
        productCode={form.product_code}
        productName={form.product_name}
        onSelect={(item) => setForm(p => ({
          ...p,
          product_code: item?.code ?? '',
          product_name: item?.name ?? '',
        }))}
        readOnly={modal === 'edit'}
        nameLabel={t('qa.productName')}
        codeLabel={t('qa.productCode')}
      />

      <Field label={t('qa.orderId')}>
        <Input value={form.order_id} onChange={setF('order_id')}
          placeholder="WO-YYYYMMDD-0001 (선택)" />
      </Field>
      <Field label={t('qa.inspector')}>
        <select value={form.inspector} onChange={setF('inspector')}
          className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full cursor-pointer">
          <option value="">선택 / 직접입력</option>
          {inspectorOpts.map(o => (
            <option key={o.code} value={o.code}>{o.name}</option>
          ))}
        </select>
      </Field>

      <Field label={t('qa.quantity')}>
        <Input type="number" value={form.quantity} onChange={setF('quantity')} min="1" />
      </Field>
      <Field label="">
        {/* spacer */}
        <div />
      </Field>

      <Field label={t('qa.passed')}>
        <Input type="number" value={form.passed} onChange={setF('passed')} min="0" />
      </Field>
      <Field label={t('qa.failed')}>
        <Input type="number" value={form.failed} onChange={setF('failed')} min="0" />
      </Field>

      {/* Live result preview */}
      <Field label="예상 결과" className="col-span-2">
        <div className="px-3 py-1.5 rounded-md text-sm border border-theme bg-base">
          <span style={{ color: previewColor, fontWeight: 600 }}>{previewLabel}</span>
          {form.quantity && form.passed && (
            <span className="text-muted ml-3 text-xs">
              합격률: {((Number(form.passed) / Number(form.quantity)) * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </Field>

      <Field label={t('qa.note')} className="col-span-2">
        <Textarea value={form.note} onChange={setF('note')} />
      </Field>
    </div>
  )
}

