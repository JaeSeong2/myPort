// BOM 관리 - 2026-05-23
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import Table from '../../../components/containers/Table'
import Modal  from '../../../components/containers/Modal'
import { Field, Input, Select, Textarea, ItemSelect, PageTitle } from '../../../components/common/FormControls'
import { UNIT_OPTIONS } from '../../../constants/items'
import { API_BASE } from '../../../constants/api'

const BOM_API   = `${API_BASE}/api/bom`
const ITEMS_API = `${API_BASE}/api/items`

const initForm = { material_code: '', material_name: '', quantity: '', unit: 'EA', note: '' }

export default function BomPage() {
  const { t }       = useLanguage()
  const { actions } = useAuth()

  const [products,    setProducts]    = useState([])
  const [selectedPrd, setSelectedPrd] = useState(null)
  const [bomRows,     setBomRows]     = useState([])
  const [filter,      setFilter]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [modal,       setModal]       = useState(null)
  const [editRow,     setEditRow]     = useState(null)
  const [form,        setForm]        = useState(initForm)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    fetch(`${ITEMS_API}?active_only=true`)
      .then(r => r.json())
      .then(j => {
        const all = j.data ?? []
        const filtered = all.filter(i => i.item_type === 'FINISHED' || i.item_type === 'SEMI')
        setProducts(filtered)
        if (filtered.length > 0) {
          setSelectedPrd(filtered[0])
          loadBom(filtered[0].code)
        }
      })
      .catch(() => {})
  }, [])

  const loadBom = useCallback(async (code) => {
    if (!code) { setBomRows([]); return }
    setLoading(true)
    try {
      const res  = await fetch(`${BOM_API}?product_code=${code}`)
      const json = await res.json()
      setBomRows(json.data ?? [])
    } catch { setBomRows([]) }
    finally  { setLoading(false) }
  }, [])

  const handleSelectProduct = (prd) => {
    setSelectedPrd(prd)
    loadBom(prd.code)
  }

  const filteredProducts = useMemo(() => {
    if (!filter) return products
    const f = filter.toLowerCase()
    return products.filter(p =>
      p.code.toLowerCase().includes(f) || p.name.toLowerCase().includes(f)
    )
  }, [products, filter])

  const columns = useMemo(() => [
    { key: 'material_code', label: t('bom.materialCode'), width: 110 },
    { key: 'material_name', label: t('bom.materialName'), width: 160 },
    { key: 'quantity',      label: t('bom.quantity'),     width: 100,
      render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'note', label: t('bom.note') },
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

  const openCreate = () => { setForm(initForm); setEditRow(null); setModal('create') }
  const openEdit   = (row) => {
    setForm({ material_code: row.material_code, material_name: row.material_name ?? '', quantity: row.quantity, unit: row.unit, note: row.note ?? '' })
    setEditRow(row)
    setModal('edit')
  }

  const handleSave = async () => {
    if (!selectedPrd) return
    setSaving(true)
    try {
      let res
      if (modal === 'edit') {
        res = await fetch(`${BOM_API}/${editRow._id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ quantity: Number(form.quantity), unit: form.unit, note: form.note }),
        })
      } else {
        res = await fetch(BOM_API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            product_code:  selectedPrd.code,
            material_code: form.material_code,
            quantity:      Number(form.quantity),
            unit:          form.unit,
            note:          form.note,
          }),
        })
      }
      if (!res.ok) { alert('저장 실패: 이미 등록된 자재일 수 있습니다.'); return }
      setModal(null)
      loadBom(selectedPrd.code)
    } finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`[${row.material_code}] ${row.material_name} 을(를) 삭제하시겠습니까?`)) return
    await fetch(`${BOM_API}/${row._id}`, { method: 'DELETE' })
    loadBom(selectedPrd.code)
  }

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left: Product List ── */}
      <div className="w-64 flex flex-col border-r border-theme overflow-hidden shrink-0">
        <div className="p-4 border-b border-theme shrink-0">
          <PageTitle title={t('bom.title')} />
          <input className="mt-2"
            value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="품목 검색..."
            className="w-full text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted">품목 없음</p>
          ) : (
            filteredProducts.map(prd => (
              <button
                key={prd.code}
                onClick={() => handleSelectProduct(prd)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-theme transition-colors cursor-pointer
                  ${selectedPrd?.code === prd.code
                    ? 'bg-accent-subtle text-accent font-medium'
                    : 'text-primary hover-bg-elevated'}`}
              >
                <div className="font-medium text-xs mb-0.5"
                  style={selectedPrd?.code === prd.code ? { color: 'var(--accent)' } : {}}>
                  {prd.code}
                </div>
                <div className="text-xs text-muted truncate">{prd.name}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: BOM Items ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPrd ? (
          <>
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-theme shrink-0">
              <div>
                <h3 className="text-primary font-semibold">{selectedPrd.name}</h3>
                <p className="text-xs text-muted mt-0.5">
                  {selectedPrd.code}
                  {selectedPrd.spec ? ` · ${selectedPrd.spec}` : ''}
                  {' · '}단가 {selectedPrd.unit_price?.toLocaleString()}원
                </p>
              </div>
              {actions.add && (
                <button onClick={openCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:opacity-90 transition-opacity cursor-pointer">
                  <Plus size={14} />
                  {t('btn.add')}
                </button>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <Table columns={columns} data={bomRows} loading={loading} emptyText={t('msg.noData')} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted text-sm">{t('bom.selectProduct')}</p>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={t(modal === 'edit' ? 'bom.edit.title' : 'bom.create.title')}
        size="sm"
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
        <div className="flex flex-col gap-4">
          <ItemSelect
            productCode={form.material_code}
            productName={form.material_name}
            nameLabel={t('bom.materialName')}
            codeLabel={t('bom.materialCode')}
            readOnly={modal === 'edit'}
            filter={(item) => item.item_type === 'RAW' || item.item_type === 'CONSUMABLE'}
            onSelect={(item) => setForm(p => ({
              ...p,
              material_code: item?.code ?? '',
              material_name: item?.name ?? '',
              unit:          item?.unit ?? 'EA',
            }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('bom.quantity')}>
              <Input type="number" value={form.quantity} onChange={setF('quantity')} />
            </Field>
            <Field label={t('bom.unit')}>
              <Select value={form.unit} onChange={setF('unit')}
                options={UNIT_OPTIONS.map(u => ({ value: u, label: u }))} />
            </Field>
          </div>
          <Field label={t('bom.note')}>
            <Textarea value={form.note} onChange={setF('note')} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

