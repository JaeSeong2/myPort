// 품목 관리 - 2026-05-24
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import { ITEM_TYPE, ITEM_TYPE_FORM, ITEM_TYPE_BADGE, UNIT_OPTIONS, ITEM_CODE_PREFIX } from '../../../constants/items'
import SearchBar from '../../../components/containers/SearchBar'
import ActionBar from '../../../components/containers/ActionBar'
import Table     from '../../../components/containers/Table'
import Modal     from '../../../components/containers/Modal'
import Badge     from '../../../components/common/Badge'
import { Field, Input, Select, Textarea, PageTitle } from '../../../components/common/FormControls'
import { exportToExcel, parseExcelFile } from '../../../utils/excel'
import { API_BASE } from '../../../constants/api'

const API = `${API_BASE}/api/items`

const initFilters = { item_type: 'ALL', code: '', name: '' }
const initForm = {
  code: '', name: '', item_type: 'FINISHED', unit: 'EA',
  spec: '', drawing_no: '', unit_price: 0,
  min_stock: 0, max_stock: 0, safety_stock: 0,
  active: true, note: '',
}

const UNIT_OPTS = UNIT_OPTIONS.map(u => ({ value: u, label: u }))

/** 품목유형별 기존 코드에서 다음 번호를 계산해 코드 자동 생성 - 2026-05-24 */
const genCode = async (type, apiUrl) => {
  try {
    const res  = await fetch(`${apiUrl}?item_type=${type}`)
    const json = await res.json()
    const items  = json.data ?? []
    const prefix = ITEM_CODE_PREFIX[type] ?? 'ITEM'
    const nums   = items.map(r => parseInt(r.code.replace(/\D/g, ''), 10) || 0)
    const next   = nums.length ? Math.max(...nums) + 1 : 1
    return `${prefix}-${String(next).padStart(3, '0')}`
  } catch { return '' }
}

export default function ItemPage() {
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
    { key: 'item_type', label: t('item.type'), type: 'select',
      options: ITEM_TYPE.map(o => ({ value: o.value, label: o.value === 'ALL' ? t('opt.all') : t(`opt.item.${o.value}`) })) },
    // { key: 'code', label: t('item.code'), type: 'text' },
    // { key: 'name', label: t('item.name'), type: 'text' },
  ], [t])

  const columns = useMemo(() => [
    { key: 'code',         label: t('item.code'),       width: 120 },
    { key: 'name',         label: t('item.name'),        width: 160 },
    { key: 'item_type',    label: t('item.type'),        width: 90,
      render: (r) => <Badge value={r.item_type} map={ITEM_TYPE_BADGE} /> },
    { key: 'unit',         label: t('item.unit'),        width: 60 },
    { key: 'spec',         label: t('item.spec'),        width: 120 },
    { key: 'unit_price',   label: t('item.unitPrice'),   width: 90,
      render: (r) => r.unit_price ? r.unit_price.toLocaleString() : '-' },
    { key: 'safety_stock', label: t('item.safetyStock'), width: 80 },
    { key: 'active',       label: t('item.active'),      width: 70,
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
      if (f.item_type !== 'ALL') p.set('item_type', f.item_type)
      // if (f.code)                p.set('code',      f.code)
      // if (f.name)                p.set('name',      f.name)
      const res  = await fetch(`${API}?${p}`)
      const json = await res.json()
      setRows(json.data ?? [])
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { handleSearch(initFilters) }, [])

  const openCreate = async () => {
    const code = await genCode(initForm.item_type, API)
    setForm({ ...initForm, code })
    setEditRow(null)
    setModal('create')
  }

  const handleTypeChange = async (e) => {
    const type = e.target.value
    if (modal === 'create') {
      const code = await genCode(type, API)
      setForm(p => ({ ...p, item_type: type, code }))
    } else {
      setForm(p => ({ ...p, item_type: type }))
    }
  }
  const openEdit   = (r) => {
    setForm({
      code: r.code, name: r.name, item_type: r.item_type, unit: r.unit,
      spec: r.spec ?? '', drawing_no: r.drawing_no ?? '',
      unit_price: r.unit_price ?? 0,
      min_stock: r.min_stock ?? 0, max_stock: r.max_stock ?? 0,
      safety_stock: r.safety_stock ?? 0,
      active: r.active, note: r.note ?? '',
    })
    setEditRow(r); setModal('edit')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal === 'edit'
      const body   = { ...form, unit_price: Number(form.unit_price),
        min_stock: Number(form.min_stock), max_stock: Number(form.max_stock),
        safety_stock: Number(form.safety_stock) }
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
      <PageTitle title={t('item.title')} />

      <SearchBar
        fields={searchFields} filters={filters}
        onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
      />




      <ActionBar
        onSearch={() => handleSearch()}
        onAdd={actions.add ? openCreate : undefined}
        onExcelDownload={actions.excel_down ? () => exportToExcel(columns, rows, '품목관리') : undefined}
        onExcelUpload={actions.excel_up ? async (file) => {
          try {
            const { rows: parsed, matched, skipped } = await parseExcelFile(file, columns)
            if (!parsed.length) { alert('업로드할 데이터가 없습니다.'); return }

            const confirmMsg = [
              `${parsed.length}행을 업로드합니다.`,
              `매칭 컬럼: ${matched.join(', ')}`,
              skipped.length ? `제외 컬럼: ${skipped.join(', ')}` : '',
              '', '계속하시겠습니까?',
            ].filter(Boolean).join('\n')
            if (!confirm(confirmMsg)) return

            let success = 0, fail = 0
            for (const row of parsed) {
              const body = {
                code:         row.code         || '',
                name:         row.name         || '',
                item_type:    row.item_type     || 'FINISHED',
                unit:         row.unit          || 'EA',
                spec:         row.spec          || '',
                drawing_no:   row.drawing_no    || '',
                unit_price:   Number(row.unit_price   || 0),
                min_stock:    Number(row.min_stock    || 0),
                max_stock:    Number(row.max_stock    || 0),
                safety_stock: Number(row.safety_stock || 0),
                active:       row.active !== 'N',
                note:         row.note          || '',
              }
              const res = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
              if (res.ok) success++; else fail++
            }
            alert(`업로드 완료\n성공: ${success}건 / 실패: ${fail}건`)
            handleSearch()
          } catch { alert('파일 처리 중 오류가 발생했습니다.') }
        } : undefined}
      />

      <Table
        columns={columns} data={rows} loading={loading}
        emptyText={t('msg.noData')}
        onRowDoubleClick={actions.edit ? openEdit : undefined}
      />

      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={t(modal === 'edit' ? 'item.edit' : 'item.create')}
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
          <Field label={t('item.type')}>
            <Select value={form.item_type} onChange={handleTypeChange}
              options={ITEM_TYPE_FORM.map(o => ({ value: o.value, label: t(`opt.item.${o.value}`) }))} />
          </Field>
          <Field label={t('item.unit')}>
            <Select value={form.unit} onChange={setF('unit')} options={UNIT_OPTS} />
          </Field>
          <Field label={t('item.name')}>
            <Input value={form.name} onChange={setF('name')} />
          </Field>
          <Field label={t('item.code')}>
            <Input value={form.code} readOnly />
          </Field>
          <Field label={t('item.spec')}>
            <Input value={form.spec} onChange={setF('spec')} />
          </Field>
          <Field label={t('item.drawingNo')}>
            <Input value={form.drawing_no} onChange={setF('drawing_no')} />
          </Field>
          <Field label={t('item.unitPrice')}>
            <Input type="number" value={form.unit_price} onChange={setF('unit_price')} />
          </Field>
          <Field label={t('item.safetyStock')}>
            <Input type="number" value={form.safety_stock} onChange={setF('safety_stock')} />
          </Field>
          <Field label={t('item.minStock')}>
            <Input type="number" value={form.min_stock} onChange={setF('min_stock')} />
          </Field>
          <Field label={t('item.maxStock')}>
            <Input type="number" value={form.max_stock} onChange={setF('max_stock')} />
          </Field>
          <Field label={t('item.note')} className="col-span-2">
            <Textarea value={form.note} onChange={setF('note')} />
          </Field>
          <label className="col-span-2 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={setF('active')} className="cursor-pointer" />
            <span className="text-sm text-primary">{t('item.active')}</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}

