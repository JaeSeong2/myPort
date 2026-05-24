// 사용자 권한관리 - 2026-05-23
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useLanguage } from '../../../context/LanguageContext'
import { useAuth }     from '../../../context/AuthContext'
import { menuConfig }  from '../../../data/menuConfig'
import SearchBar  from '../../../components/containers/SearchBar'
import ActionBar  from '../../../components/containers/ActionBar'
import Table      from '../../../components/containers/Table'
import Modal      from '../../../components/containers/Modal'
import { Field, PageTitle }  from '../../../components/common/FormControls'
import { API_BASE } from '../../../constants/api'

const API = `${API_BASE}/api/users`

const INIT_FILTERS = { role: 'ALL', name: '' }
const FULL_ACTIONS = { add: true, edit: true, delete: true, excel_up: true, excel_down: true }
const EMPTY_ACTIONS = { add: false, edit: false, delete: false, excel_up: false, excel_down: false }

const INIT_FORM = {
  user_id: '', name: '', role: 'USER', email: '',
  menus: [], actions: EMPTY_ACTIONS, active: true,
}

// menuConfig에서 권한 편집용 평탄 목록 추출
const MENU_TREE = menuConfig.map(item => ({
  id: item.id,
  labelKey: item.labelKey,
  isParent: true,
  children: (item.children ?? []).map(c => ({ id: c.id, labelKey: c.labelKey, isParent: false })),
}))

export default function UserPage() {
  const { t } = useLanguage()
  const { loadUsers } = useAuth()

  const [filters, setFilters] = useState(INIT_FILTERS)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(null)   // 'create' | 'edit'
  const [editRow, setEditRow] = useState(null)
  const [form,    setForm]    = useState(INIT_FORM)
  const [saving,  setSaving]  = useState(false)

  const searchFields = useMemo(() => [
    { key: 'role', label: t('user.role'), type: 'select',
      options: [
        { value: 'ALL',   label: t('opt.all') },
        { value: 'ADMIN', label: t('opt.role.ADMIN') },
        { value: 'USER',  label: t('opt.role.USER') },
      ],
    },
    { key: 'name', label: t('user.name'), type: 'text' },
  ], [t])

  const columns = useMemo(() => [
    { key: 'user_id', label: t('user.userId'), width: 120 },
    { key: 'name',    label: t('user.name'),   width: 120 },
    { key: 'role',    label: t('user.role'),   width: 80,
      render: (r) => (
        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
          r.role === 'ADMIN' ? 'bg-accent text-white' : 'bg-elevated text-muted border border-theme'
        }`}>
          {t(`opt.role.${r.role}`)}
        </span>
      )},
    { key: 'email',   label: t('user.email'), width: 160 },
    { key: 'active',  label: t('user.active'), width: 80,
      render: (r) => (
        <span className={r.active ? 'text-accent text-xs' : 'text-muted text-xs'}>
          {r.active ? '사용' : '미사용'}
        </span>
      )},
  ], [t])

  const handleSearch = useCallback(async (f = filters) => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.role !== 'ALL') p.set('role', f.role)
      const res  = await fetch(`${API}?${p}`)
      const json = await res.json()
      let data = json.data ?? []
      if (f.name) data = data.filter(u => u.name.includes(f.name))
      setRows(data)
    } catch { setRows([]) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { handleSearch(INIT_FILTERS) }, [])

  const openCreate = () => {
    setForm(INIT_FORM)
    setEditRow(null)
    setModal('create')
  }
  const openEdit = (row) => {
    setForm({
      user_id: row.user_id,
      name:    row.name,
      role:    row.role,
      email:   row.email ?? '',
      menus:   row.menus ?? [],
      actions: row.actions ?? EMPTY_ACTIONS,
      active:  row.active,
    })
    setEditRow(row)
    setModal('edit')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const isEdit = modal === 'edit'
      const body = isEdit
        ? { name: form.name, role: form.role, email: form.email, menus: form.menus, actions: form.actions, active: form.active }
        : form
      const res = await fetch(isEdit ? `${API}/${editRow._id}` : API, {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) return
      setModal(null)
      handleSearch()
      loadUsers()  // TopBar 사용자 목록 갱신
    } finally { setSaving(false) }
  }

  const handleDelete = async (row) => {
    if (!confirm(`[${row.user_id}] ${row.name} 을(를) 삭제하시겠습니까?`)) return
    await fetch(`${API}/${row._id}`, { method: 'DELETE' })
    handleSearch()
    loadUsers()
  }

  return (
    <div className="h-full p-6 flex flex-col gap-4 overflow-hidden">
      <PageTitle title={t('user.title')} />

      <SearchBar
        fields={searchFields} filters={filters}
        onChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
      />

      <ActionBar
        onSearch={() => handleSearch()}
        onAdd={openCreate}
      />

      <Table
        columns={columns} data={rows} loading={loading}
        emptyText={t('msg.noData')}
        onRowDoubleClick={openEdit}
      />

      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={t(modal === 'edit' ? 'user.edit' : 'user.create')}
        size="lg"
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
        <UserForm form={form} setForm={setForm} isEdit={modal === 'edit'} t={t} onDelete={editRow ? () => { handleDelete(editRow); setModal(null) } : null} />
      </Modal>
    </div>
  )
}

// ── 사용자 등록/수정 폼 ────────────────────────────────────
function UserForm({ form, setForm, isEdit, t, onDelete }) {
  const isAdmin = form.role === 'ADMIN'

  const setF = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const allMenuIds = MENU_TREE.flatMap(g => [g.id, ...g.children.map(c => c.id)])

  const toggleMenu = (id, isParent, group) => {
    setForm(prev => {
      const cur = prev.menus
      if (isParent) {
        const childIds = group.children.map(c => c.id)
        const allChecked = childIds.every(c => cur.includes(c)) && cur.includes(id)
        if (allChecked) {
          return { ...prev, menus: cur.filter(m => m !== id && !childIds.includes(m)) }
        } else {
          return { ...prev, menus: [...new Set([...cur, id, ...childIds])] }
        }
      } else {
        if (cur.includes(id)) return { ...prev, menus: cur.filter(m => m !== id) }
        return { ...prev, menus: [...cur, id] }
      }
    })
  }

  const toggleAction = (key) =>
    setForm(p => ({ ...p, actions: { ...p.actions, [key]: !p.actions[key] } }))

  const toggleAllMenus = (checked) =>
    setForm(p => ({ ...p, menus: checked ? allMenuIds : [] }))

  const allMenusChecked = allMenuIds.every(id => form.menus.includes(id))

  return (
    <div className="flex flex-col gap-5">
      {/* 기본 정보 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">기본 정보</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field label={t('user.userId')}>
            <input value={form.user_id} onChange={setF('user_id')} disabled={isEdit}
              className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full disabled:opacity-50" />
          </Field>
          <Field label={t('user.name')}>
            <input value={form.name} onChange={setF('name')}
              className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full" />
          </Field>
          <Field label={t('user.role')}>
            <select value={form.role} onChange={setF('role')}
              className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full cursor-pointer">
              <option value="ADMIN">{t('opt.role.ADMIN')}</option>
              <option value="USER">{t('opt.role.USER')}</option>
            </select>
          </Field>
          <Field label={t('user.email')}>
            <input value={form.email} onChange={setF('email')} type="email"
              className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full" />
          </Field>
          <Field label={t('user.active')}>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={form.active}
                onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4 cursor-pointer" />
              <span className="text-sm text-primary">사용</span>
            </label>
          </Field>
        </div>
      </section>

      {/* 메뉴 접근 권한 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">{t('user.menus')}</h3>
          {!isAdmin && (
            <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
              <input type="checkbox" checked={allMenusChecked}
                onChange={e => toggleAllMenus(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer" />
              전체 선택
            </label>
          )}
        </div>
        {isAdmin && (
          <p className="text-xs text-accent bg-accent-subtle px-3 py-2 rounded-md">
            관리자 권한은 모든 메뉴에 자동으로 접근할 수 있습니다.
          </p>
        )}
        {!isAdmin && (
          <div className="border border-theme rounded-lg p-3 grid grid-cols-2 gap-x-6 gap-y-1 max-h-52 overflow-y-auto">
            {MENU_TREE.map(group => (
              <div key={group.id} className="flex flex-col gap-0.5">
                {/* 부모 그룹 */}
                <label className="flex items-center gap-1.5 py-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      group.children.length === 0
                        ? form.menus.includes(group.id)
                        : group.children.every(c => form.menus.includes(c.id))
                    }
                    onChange={() => toggleMenu(group.id, true, group)}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-primary">{t(group.labelKey)}</span>
                </label>
                {/* 자식 메뉴 */}
                {group.children.map(child => (
                  <label key={child.id} className="flex items-center gap-1.5 pl-4 py-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.menus.includes(child.id)}
                      onChange={() => toggleMenu(child.id, false, group)}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-xs text-muted">{t(child.labelKey)}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 기능 버튼 권한 */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">{t('user.actions')}</h3>
        {isAdmin && (
          <p className="text-xs text-accent bg-accent-subtle px-3 py-2 rounded-md">
            관리자 권한은 모든 기능 버튼을 사용할 수 있습니다.
          </p>
        )}
        {!isAdmin && (
          <div className="flex flex-wrap gap-4 border border-theme rounded-lg p-3">
            {['add', 'edit', 'delete', 'excel_up', 'excel_down'].map(key => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.actions[key] ?? false}
                  onChange={() => toggleAction(key)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-primary">{t(`user.act.${key}`)}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* 삭제 버튼 (수정 모드) */}
      {isEdit && onDelete && (
        <div className="border-t border-theme pt-3">
          <button onClick={onDelete}
            className="text-xs text-danger hover:opacity-80 cursor-pointer transition-opacity">
            이 사용자 삭제
          </button>
        </div>
      )}
    </div>
  )
}

