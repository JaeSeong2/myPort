// 자재 현황 - 2026-05-23
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import { INV_TXN_TYPE, INV_TXN_TYPE_FORM, INV_TXN_BADGE, STOCK_STATUS_BADGE } from '../../../constants/inventory'
import { UNIT_OPTIONS } from '../../../constants/items'
import { ITEM_TYPE_BADGE } from '../../../constants/items'
import SearchBar from '../../../components/containers/SearchBar'
import ActionBar from '../../../components/containers/ActionBar'
import Table     from '../../../components/containers/Table'
import Modal     from '../../../components/containers/Modal'
import { Field, Input, Select, Textarea, ItemSelect, PageTitle } from '../../../components/common/FormControls'
import Badge     from '../../../components/common/Badge'
import { probeMonthRange } from '../../../utils/effectiveMonth'
import { API_BASE } from '../../../constants/api'

const INV_API   = `${API_BASE}/api/inventory`
const ITEMS_API = `${API_BASE}/api/items`

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

const getStockStatus = (current, safety) => {
  if (current <= 0 || (safety > 0 && current < safety)) return 'LOW'
  return 'OK'
}

const TABS = [
  { key: 'stock', labelKey: 'inv.tab.stock' },
  { key: 'txn',   labelKey: 'inv.tab.txn' },
]

const initStockFilters = { item_code: 'ALL' }
const initTxnFilters   = { txn_type: 'ALL', item_code: '', dateRange: getMonthRange() }
const initForm         = { txn_type: 'IN', item_code: '', item_name: '', quantity: '', unit: 'EA',
  txn_date: '', note: '' }

export default function StatusPage() {
  const { t } = useLanguage()
  const { actions } = useAuth()

  const [tab,          setTab]          = useState('stock')
  const [stockFilters, setStockFilters] = useState(initStockFilters)
  const [txnFilters,   setTxnFilters]   = useState(initTxnFilters)
  const [stockRows,    setStockRows]    = useState([])
  const [txnRows,      setTxnRows]      = useState([])
  const [loading,      setLoading]      = useState(false)
  const [modal,        setModal]        = useState(false)
  const [form,         setForm]         = useState(initForm)
  const [saving,       setSaving]       = useState(false)

  // ── 재고현황 컬럼 ─────────────────────────────────────
  const stockColumns = useMemo(() => [
    { key: 'item_code',     label: t('inv.itemCode'),     width: 110 },
    { key: 'item_name',     label: t('inv.itemName'),    width: 160 },
    { key: 'item_type',     label: t('inv.itemType'),     width: 90,
      render: (r) => <Badge value={r.item_type} map={ITEM_TYPE_BADGE} /> },
    { key: 'unit',          label: t('inv.unit'),         width: 60 },
    { key: 'current_stock', label: t('inv.currentStock'), width: 90,
      render: (r) => <span className={r.current_stock <= 0 ? 'text-danger font-medium' : 'text-primary'}>{r.current_stock.toLocaleString()}</span> },
    { key: 'safety_stock',  label: t('inv.safetyStock'),  width: 90,
      render: (r) => r.safety_stock > 0 ? r.safety_stock.toLocaleString() : '-' },
    { key: 'stock_status',  label: t('inv.stockStatus'),  width: 80,
      render: (r) => <Badge value={getStockStatus(r.current_stock, r.safety_stock)} map={STOCK_STATUS_BADGE} /> },
  ], [t])

  // ── 입출고 이력 컬럼 ──────────────────────────────────
  const txnColumns = useMemo(() => [
    { key: 'txn_date',  label: t('inv.txnDate'),  width: 100 },
    { key: 'txn_id',    label: t('inv.txnId'),    width: 160 },
    { key: 'txn_type',  label: t('inv.txnType'),  width: 70,
      render: (r) => <Badge value={r.txn_type} map={INV_TXN_BADGE} /> },
    { key: 'item_code', label: t('inv.itemCode'), width: 110 },
    { key: 'item_name', label: t('inv.itemName') },
    { key: 'qty',       label: t('inv.quantity'), width: 90,
      render: (r) => `${r.quantity.toLocaleString()} ${r.unit}` },
    { key: 'ref',       label: t('inv.refId'),    width: 160,
      render: (r) => r.ref_id ? `[${r.ref_type}] ${r.ref_id}` : '-' },
    { key: 'note',      label: t('inv.note') },
  ], [t])

  // ── 재고 조회 ─────────────────────────────────────────
  const loadStock = useCallback(async (f = stockFilters) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.item_code && f.item_code !== 'ALL') p.set('item_code', f.item_code)
      const res  = await fetch(`${INV_API}?${p}`)
      const json = await res.json()
      setStockRows(json.data ?? [])
    } catch { setStockRows([]) }
    finally  { setLoading(false) }
  }, [stockFilters])

  // ── 입출고 이력 조회 ──────────────────────────────────
  const loadTxns = useCallback(async (f = txnFilters) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.item_code)               p.set('item_code',  f.item_code)
      if (f.txn_type !== 'ALL')      p.set('txn_type',   f.txn_type)
      if (f.dateRange[0])            p.set('start_date', f.dateRange[0])
      if (f.dateRange[1])            p.set('end_date',   f.dateRange[1])
      const res  = await fetch(`${INV_API}/txns?${p}`)
      const json = await res.json()
      setTxnRows(json.data ?? [])
    } catch { setTxnRows([]) }
    finally  { setLoading(false) }
  }, [txnFilters])

  useEffect(() => { loadStock(initStockFilters) }, [])

  const handleTabChange = (key) => {
    setTab(key)
    if (key === 'stock') { loadStock(initStockFilters); return }
    // 입출고 이력: 데이터 있는 최신월로 기본 조회(월 이월) - 2026-09-01
    (async () => {
      const dateRange = await probeMonthRange(`${INV_API}/txns`, 'txn_date')
      const f = { ...initTxnFilters, dateRange }
      setTxnFilters(f)
      loadTxns(f)
    })()
  }

  const handleSearch = () => {
    if (tab === 'stock') loadStock()
    else                 loadTxns()
  }

  const openCreate = () => {
    setForm({ ...initForm, txn_date: fmtDate(new Date()) })
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = { ...form, quantity: Number(form.quantity) }
      const res  = await fetch(`${INV_API}/txns`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) return
      setModal(false)
      loadStock(stockFilters)
      loadTxns(txnFilters)
    } finally { setSaving(false) }
  }

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  // 재고현황 검색 필드
  const stockSearchFields = useMemo(() => [
    { key: 'item_code', label: t('inv.itemName'), type: 'select',
      optionsFrom: `${ITEMS_API}` },
  ], [t])

  // 입출고 이력 검색 필드
  const txnSearchFields = useMemo(() => [
    { key: 'txn_type',  label: t('inv.txnType'),  type: 'select',
      options: INV_TXN_TYPE.map(o => ({ value: o.value, label: o.value === 'ALL' ? t('opt.all') : t(`opt.txn.${o.value}`) })) },
    { key: 'item_code', label: t('inv.itemCode'), type: 'text' },
    { key: 'dateRange', label: t('inv.dateRange'), type: 'daterange' },
  ], [t])

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <PageTitle title={t('inv.title')} />

      {/* 탭 */}
      <div className="flex gap-0 border-b border-theme">
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => handleTabChange(tb.key)}
            className={`px-5 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px
              ${tab === tb.key ? 'border-accent text-accent' : 'border-transparent text-muted hover-text-primary'}`}>
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'stock' ? (
        <>
          <SearchBar fields={stockSearchFields} filters={stockFilters}
            onChange={(k, v) => setStockFilters(p => ({ ...p, [k]: v }))} />
          <ActionBar
            onSearch={handleSearch}
            onAdd={actions.add ? openCreate : undefined}
          />
          <Table columns={stockColumns} data={stockRows} loading={loading} emptyText={t('msg.noData')} />
        </>
      ) : (
        <>
          <SearchBar fields={txnSearchFields} filters={txnFilters}
            onChange={(k, v) => setTxnFilters(p => ({ ...p, [k]: v }))} />
          <ActionBar
            onSearch={handleSearch}
            onAdd={actions.add ? openCreate : undefined}
          />
          <Table columns={txnColumns} data={txnRows} loading={loading} emptyText={t('msg.noData')} />
        </>
      )}

      {/* 입출고 등록 모달 */}
      <Modal
        open={modal} onClose={() => setModal(false)}
        title={t('inv.create.title')}
        size="sm"
        footer={
          <>
            <button onClick={() => setModal(false)}
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
        <TxnForm form={form} setForm={setForm} setF={setF} t={t} />
      </Modal>
    </div>
  )
}

// ── 입출고 입력 폼 ─────────────────────────────────────────
function TxnForm({ form, setForm, setF, t }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('inv.txnType')}>
        <Select value={form.txn_type} onChange={setF('txn_type')}
          options={INV_TXN_TYPE_FORM.map(o => ({ value: o.value, label: t(`opt.txn.${o.value}`) }))} />
      </Field>
      <ItemSelect
        productCode={form.item_code}
        productName={form.item_name}
        nameLabel={t('inv.itemName')}
        codeLabel={t('inv.itemCode')}
        onSelect={(item) => setForm(p => ({
          ...p,
          item_code: item?.code ?? '',
          item_name: item?.name ?? '',
          unit:      item?.unit ?? 'EA',
        }))}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('inv.quantity')}>
          <Input type="number" value={form.quantity} onChange={setF('quantity')} />
        </Field>
        <Field label={t('inv.unit')}>
          <Select value={form.unit} onChange={setF('unit')}
            options={UNIT_OPTIONS.map(u => ({ value: u, label: u }))} />
        </Field>
      </div>
      <Field label={t('inv.txnDate')}>
        <Input type="date" value={form.txn_date} onChange={setF('txn_date')} />
      </Field>
      <Field label={t('inv.note')}>
        <Textarea value={form.note} onChange={setF('note')} />
      </Field>
    </div>
  )
}

