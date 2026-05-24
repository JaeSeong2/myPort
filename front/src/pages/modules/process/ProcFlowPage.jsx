// 공정 흐름 - 2026-05-24
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Pencil, Trash2, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import Table  from '../../../components/containers/Table'
import Modal  from '../../../components/containers/Modal'
import { Field, Input, Select, Textarea, PageTitle } from '../../../components/common/FormControls'
import { API_BASE } from '../../../constants/api'

const FLOW_API  = `${API_BASE}/api/process-flow`
const ITEMS_API = `${API_BASE}/api/items`
const PROC_API  = `${API_BASE}/api/master?category=process`

const initForm = { process_code: '', process_name: '', sequence: 1, cycle_time: '', note: '' }

export default function FlowPage() {
  const { t }       = useLanguage()
  const { actions } = useAuth()

  const [products,    setProducts]    = useState([])
  const [processes,   setProcesses]   = useState([])
  const [selectedPrd, setSelectedPrd] = useState(null)
  const [flowRows,    setFlowRows]    = useState([])
  const [filter,      setFilter]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [modal,       setModal]       = useState(null)
  const [editRow,     setEditRow]     = useState(null)
  const [form,        setForm]        = useState(initForm)
  const [saving,      setSaving]      = useState(false)
  const [viewMode,    setViewMode]    = useState('flow') // 'flow' | 'table'

  useEffect(() => {
    fetch(`${ITEMS_API}?active_only=true`)
      .then(r => r.json())
      .then(j => {
        const all = j.data ?? []
        const filtered = all.filter(i => i.item_type === 'FINISHED' || i.item_type === 'SEMI')
        setProducts(filtered)
        if (filtered.length > 0) {
          setSelectedPrd(filtered[0])
          loadFlow(filtered[0].code)
        }
      })
      .catch(() => {})

    fetch(PROC_API)
      .then(r => r.json())
      .then(j => setProcesses(j.data ?? []))
      .catch(() => {})
  }, [])

  const loadFlow = useCallback(async (code) => {
    if (!code) { setFlowRows([]); return }
    setLoading(true)
    try {
      const res  = await fetch(`${FLOW_API}?product_code=${code}`)
      const json = await res.json()
      setFlowRows((json.data ?? []).sort((a, b) => a.sequence - b.sequence))
    } catch { setFlowRows([]) }
    finally  { setLoading(false) }
  }, [])

  const handleSelectProduct = (prd) => {
    setSelectedPrd(prd)
    loadFlow(prd.code)
  }

  const filteredProducts = useMemo(() => {
    if (!filter) return products
    const f = filter.toLowerCase()
    return products.filter(p =>
      p.code.toLowerCase().includes(f) || p.name.toLowerCase().includes(f)
    )
  }, [products, filter])

  const columns = useMemo(() => [
    { key: 'sequence',     label: t('flow.sequence'),    width: 60 },
    { key: 'process_code', label: t('flow.processCode'), width: 110 },
    { key: 'process_name', label: t('flow.processName'), width: 160 },
    { key: 'cycle_time',   label: t('flow.cycleTime'),   width: 110,
      render: (r) => r.cycle_time ? `${r.cycle_time} min` : '-' },
    { key: 'note', label: t('flow.note') },
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

  const openCreate = () => {
    const nextSeq = flowRows.length > 0 ? Math.max(...flowRows.map(r => r.sequence)) + 1 : 1
    setForm({ ...initForm, sequence: nextSeq })
    setEditRow(null)
    setModal('create')
  }

  const openEdit = (row) => {
    setForm({
      process_code: row.process_code,
      process_name: row.process_name ?? '',
      sequence:     row.sequence,
      cycle_time:   row.cycle_time ?? '',
      note:         row.note ?? '',
    })
    setEditRow(row)
    setModal('edit')
  }

  const handleProcessSelect = (e) => {
    const code = e.target.value
    const proc = processes.find(p => p.code === code)
    setForm(f => ({ ...f, process_code: code, process_name: proc?.name ?? '' }))
  }

  const handleSave = async () => {
    if (!selectedPrd) return
    setSaving(true)
    try {
      let res
      if (modal === 'edit') {
        res = await fetch(`${FLOW_API}/${editRow._id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            process_name: form.process_name,
            sequence:     Number(form.sequence),
            cycle_time:   form.cycle_time !== '' ? Number(form.cycle_time) : 0,
            note:         form.note,
          }),
        })
      } else {
        res = await fetch(FLOW_API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            product_code: selectedPrd.code,
            process_code: form.process_code,
            process_name: form.process_name,
            sequence:     Number(form.sequence),
            cycle_time:   form.cycle_time !== '' ? Number(form.cycle_time) : 0,
            note:         form.note,
          }),
        })
      }
      if (!res.ok) { alert('저장 실패: 이미 등록된 공정일 수 있습니다.'); return }
      setModal(null)
      loadFlow(selectedPrd.code)
    } finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`[${row.process_code}] ${row.process_name} 을(를) 삭제하시겠습니까?`)) return
    await fetch(`${FLOW_API}/${row._id}`, { method: 'DELETE' })
    loadFlow(selectedPrd.code)
  }

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left: Product List ── */}
      <div className="w-64 flex flex-col border-r border-theme overflow-hidden shrink-0">
        <div className="p-4 border-b border-theme shrink-0">
          <PageTitle title={t('flow.title')} />
          <input
            value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="품목 검색..."
            className="mt-2 w-full text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary"
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

      {/* ── Right: Flow ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPrd ? (
          <>
            {/* Header */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-theme shrink-0">
              <div>
                <h3 className="text-primary font-semibold">{selectedPrd.name}</h3>
                <p className="text-xs text-muted mt-0.5">{selectedPrd.code}</p>
              </div>
              {/* View toggle */}
              <div className="flex rounded-md border border-theme overflow-hidden">
                {['flow', 'table'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)}
                    className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer
                      ${viewMode === m ? 'bg-accent text-white' : 'text-muted hover-bg-elevated'}`}>
                    {m === 'flow' ? '흐름도' : '목록'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-4">
              {viewMode === 'table' ? (
                <Table columns={columns} data={flowRows} loading={loading} emptyText={t('msg.noData')} />
              ) : (
                <FlowDiagram rows={flowRows} loading={loading} onEdit={actions.edit ? openEdit : undefined} onDelete={actions.delete ? handleDelete : undefined} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted text-sm">{t('flow.selectProduct')}</p>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={t(modal === 'edit' ? 'flow.edit.title' : 'flow.create.title')}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('flow.processCode')}>
              {modal === 'edit' ? (
                <Input value={form.process_code} readOnly />
              ) : (
                <select value={form.process_code} onChange={handleProcessSelect}
                  className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full cursor-pointer">
                  <option value="">-- 선택 --</option>
                  {processes.map(p => (
                    <option key={p.code} value={p.code}>{p.code} {p.name}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t('flow.processName')}>
              <Input value={form.process_name} onChange={setF('process_name')} />
            </Field>
            <Field label={t('flow.sequence')}>
              <Input type="number" value={form.sequence} onChange={setF('sequence')} />
            </Field>
            <Field label={t('flow.cycleTime')}>
              <Input type="number" value={form.cycle_time} onChange={setF('cycle_time')} />
            </Field>
          </div>
          <Field label={t('flow.note')}>
            <Textarea value={form.note} onChange={setF('note')} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

// ── 흐름도 컴포넌트 ──────────────────────────────────────────
function FlowDiagram({ rows, loading, onEdit, onDelete }) {
  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted text-sm">로딩 중...</div>
  }
  if (rows.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted text-sm">등록된 공정이 없습니다.</div>
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 원자재 → ... → 완제품 흐름 */}
      <div className="flex flex-col gap-0 items-center py-4">
        {/* Start node */}
        <FlowNode type="start" label="원자재 투입" />
        <FlowArrow />

        {rows.map((row, idx) => (
          <div key={row._id} className="flex flex-col items-center w-full">
            <FlowStepNode row={row} onEdit={onEdit} onDelete={onDelete} />
            {idx < rows.length - 1 && <FlowArrow />}
          </div>
        ))}

        <FlowArrow />
        {/* End node */}
        <FlowNode type="end" label="완제품 출고" />
      </div>
    </div>
  )
}

function FlowNode({ type, label }) {
  const isStart = type === 'start'
  return (
    <div className={`px-5 py-2 rounded-full text-xs font-semibold border-2
      ${isStart
        ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-600 dark:text-green-300'
        : 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300'
      }`}>
      {label}
    </div>
  )
}

function FlowArrow() {
  return (
    <div className="flex flex-col items-center" style={{ height: 28 }}>
      <div className="w-px flex-1" style={{ background: 'var(--border)' }} />
      <ChevronRight size={14} className="text-muted rotate-90 shrink-0" style={{ marginTop: -4 }} />
    </div>
  )
}

function FlowStepNode({ row, onEdit, onDelete }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="bg-surface border border-theme rounded-xl px-5 py-3 flex items-center gap-4">
        {/* Sequence badge */}
        <div className="w-8 h-8 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center shrink-0">
          {row.sequence}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-primary">{row.process_name}</div>
          <div className="text-xs text-muted mt-0.5">
            {row.process_code}
            {row.cycle_time > 0 && ` · ${row.cycle_time} min`}
            {row.note && ` · ${row.note}`}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <button onClick={() => onEdit(row)}
                className="p-1 rounded text-muted hover-text-accent hover-bg-elevated transition-colors cursor-pointer">
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(row)}
                className="p-1 rounded text-muted hover-text-danger hover-bg-elevated transition-colors cursor-pointer">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
