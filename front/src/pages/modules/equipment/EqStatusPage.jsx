// 설비 현황 - 2026-05-24
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import {
  EQ_TYPE, EQ_TYPE_FORM, EQ_TYPE_BADGE,
  EQ_STATUS, EQ_STATUS_FORM, EQ_STATUS_BADGE, EQ_CODE_PREFIX,
} from '../../../constants/equipment'
import SearchBar from '../../../components/containers/SearchBar'
import ActionBar from '../../../components/containers/ActionBar'
import Table     from '../../../components/containers/Table'
import Modal     from '../../../components/containers/Modal'
import Badge     from '../../../components/common/Badge'
import { Field, Input, Select, Textarea, PageTitle } from '../../../components/common/FormControls'
import { exportToExcel } from '../../../utils/excel'
import { API_BASE } from '../../../constants/api'

const API = `${API_BASE}/api/equipment`

const initFilters = { eq_type: 'ALL', status: 'ALL' }
const initForm = {
  code: '', name: '', eq_type: 'PRODUCTION', status: 'IDLE',
  location: '', manufacturer: '', install_date: '', last_pm_date: '',
  active: true, note: '',
}

/** 설비유형별 코드 자동 생성 - 2026-05-24 */
const genCode = async (type, apiUrl) => {
  try {
    const res  = await fetch(`${apiUrl}?eq_type=${type}`)
    const json = await res.json()
    const items  = json.data ?? []
    const prefix = EQ_CODE_PREFIX[type] ?? 'EQ'
    const nums   = items.map(r => parseInt(r.code.replace(/\D/g, ''), 10) || 0)
    const next   = nums.length ? Math.max(...nums) + 1 : 1
    return `${prefix}-${String(next).padStart(3, '0')}`
  } catch { return '' }
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
    { key: 'eq_type', label: t('eq.type'), type: 'select',
      options: EQ_TYPE.map(o => ({ value: o.value, label: o.value === 'ALL' ? t('opt.all') : t(`opt.eq.type.${o.value}`) })) },
    { key: 'status',  label: t('eq.status'), type: 'select',
      options: EQ_STATUS.map(o => ({ value: o.value, label: o.value === 'ALL' ? t('opt.all') : t(`opt.eq.status.${o.value}`) })) },
  ], [t])

  const columns = useMemo(() => [
    { key: 'code',         label: t('eq.code'),        width: 110 },
    { key: 'name',         label: t('eq.name'),         width: 160 },
    { key: 'eq_type',      label: t('eq.type'),         width: 90,
      render: (r) => <Badge value={r.eq_type} map={EQ_TYPE_BADGE} /> },
    { key: 'status',       label: t('eq.status'),       width: 90,
      render: (r) => <Badge value={r.status} map={EQ_STATUS_BADGE} /> },
    { key: 'location',     label: t('eq.location'),     width: 100 },
    { key: 'manufacturer', label: t('eq.manufacturer'), width: 120 },
    { key: 'last_pm_date', label: t('eq.lastPmDate'),   width: 110 },
    { key: 'active', label: t('eq.active'), width: 70,
      render: (r) => <span className={r.active ? 'text-accent text-sm' : 'text-muted text-sm'}>{r.active ? '●' : '○'}</span> },
    ...(actions.edit || actions.delete ? [{
      key: 'row-actions', label: '', width: 72,
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
      if (f.eq_type !== 'ALL') p.set('eq_type', f.eq_type)
      if (f.status  !== 'ALL') p.set('status',  f.status)
      const res  = await fetch(`${API}?${p}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { handleSearch(initFilters) }, [])

  const openCreate = async () => {
    const code = await genCode(initForm.eq_type, API)
    setForm({ ...initForm, code })
    setEditRow(null)
    setModal('create')
  }

  const handleTypeChange = async (e) => {
    const type = e.target.value
    if (modal === 'create') {
      const code = await genCode(type, API)
      setForm(p => ({ ...p, eq_type: type, code }))
    } else {
      setForm(p => ({ ...p, eq_type: type }))
    }
  }

  const openEdit = (r) => {
    setForm({
      code:         r.code,
      name:         r.name,
      eq_type:      r.eq_type,
      status:       r.status,
      location:     r.location     ?? '',
      manufacturer: r.manufacturer ?? '',
      install_date: r.install_date ?? '',
      last_pm_date: r.last_pm_date ?? '',
      active:       r.active,
      note:         r.note ?? '',
    })
    setEditRow(r); setModal('edit')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal === 'edit'
      const body   = { ...form }
      const res = await fetch(isEdit ? `${API}/${editRow._id}` : API, {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(isEdit ? (({ code, ...rest }) => rest)(body) : body),
      })
      if (!res.ok) { const e = await res.json(); alert(e.detail); return }
      setModal(null); handleSearch()
    } finally { setSaving(false) }
  }

  const handleDelete = async (r) => {
    if (!confirm(`[${r.code}] ${r.name} 을(를) 삭제하시겠습니까?`)) return
    await fetch(`${API}/${r._id}`, { method: 'DELETE' })
    handleSearch()
  }

  const setF = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(p => ({ ...p, [key]: val }))
  }

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <PageTitle title={t('eq.title')} />

      <SearchBar
        fields={searchFields} filters={filters}
        onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
      />

      <ActionBar
        onSearch={() => handleSearch()}
        onAdd={actions.add ? openCreate : undefined}
        onExcelDownload={actions.excel_down ? () => exportToExcel(columns, rows, '설비현황') : undefined}
      />

      <Table
        columns={columns} data={rows} loading={loading}
        emptyText={t('msg.noData')}
        onRowDoubleClick={actions.edit ? openEdit : undefined}
      />

      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={t(modal === 'edit' ? 'eq.edit' : 'eq.create')}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label={t('eq.type')}>
            <Select value={form.eq_type} onChange={handleTypeChange}
              options={EQ_TYPE_FORM.map(o => ({ value: o.value, label: t(`opt.eq.type.${o.value}`) }))} />
          </Field>
          <Field label={t('eq.status')}>
            <Select value={form.status} onChange={setF('status')}
              options={EQ_STATUS_FORM.map(o => ({ value: o.value, label: t(`opt.eq.status.${o.value}`) }))} />
          </Field>
          <Field label={t('eq.name')}>
            <Input value={form.name} onChange={setF('name')} />
          </Field>
          <Field label={t('eq.code')}>
            <Input value={form.code} readOnly />
          </Field>
          <Field label={t('eq.location')}>
            <Input value={form.location} onChange={setF('location')} />
          </Field>
          <Field label={t('eq.manufacturer')}>
            <Input value={form.manufacturer} onChange={setF('manufacturer')} />
          </Field>
          <Field label={t('eq.installDate')}>
            <Input type="date" value={form.install_date} onChange={setF('install_date')} />
          </Field>
          <Field label={t('eq.lastPmDate')}>
            <Input type="date" value={form.last_pm_date} onChange={setF('last_pm_date')} />
          </Field>
          <Field label={t('eq.note')} className="col-span-2">
            <Textarea value={form.note} onChange={setF('note')} />
          </Field>
          <label className="col-span-2 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={setF('active')} className="cursor-pointer" />
            <span className="text-sm text-primary">{t('eq.active')}</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
