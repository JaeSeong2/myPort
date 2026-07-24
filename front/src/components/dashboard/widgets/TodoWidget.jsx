// 할 일 목록 위젯 — 체크리스트, 사용자별 자동 저장 - 2026-07-24
import { useState, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'

const keyFor = (uid) => `mes_widget_todo_${(uid || 'guest').toLowerCase()}`

const load = (uid) => {
  try {
    const v = JSON.parse(localStorage.getItem(keyFor(uid)))
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

export default function TodoWidget() {
  const { currentUser } = useAuth()
  const uid = currentUser?.user_id
  const [items, setItems] = useState(() => load(uid))
  const [input, setInput] = useState('')

  useEffect(() => { setItems(load(uid)) }, [uid])

  const commit = (next) => {
    setItems(next)
    try { localStorage.setItem(keyFor(uid), JSON.stringify(next)) } catch {}
  }

  const add = () => {
    const t = input.trim()
    if (!t) return
    commit([...items, { id: Date.now(), text: t, done: false }])
    setInput('')
  }
  const toggle = (id) => commit(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  const remove = (id) => commit(items.filter((i) => i.id !== id))

  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="bg-surface border border-theme rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-primary">할 일 목록</h3>
        {items.length > 0 && (
          <span className="text-xs text-muted">{doneCount}/{items.length}</span>
        )}
      </div>

      <div className="flex gap-2 mb-3 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder="할 일 추가…"
          className="flex-1 rounded-lg border border-theme bg-base px-3 py-1.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-(--accent)"
        />
        <button onClick={add}
          className="flex items-center justify-center w-8 rounded-lg text-white bg-(--accent) hover:opacity-80 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted text-center py-3">할 일이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-auto">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 group">
              <button onClick={() => toggle(i.id)}
                className={`flex items-center justify-center w-4 h-4 rounded border transition-colors shrink-0 ${
                  i.done ? 'bg-emerald-400/80 border-emerald-400 text-white' : 'border-theme text-transparent'
                }`}>
                <Check size={11} />
              </button>
              <span className={`flex-1 text-sm truncate ${i.done ? 'line-through text-muted' : 'text-primary'}`}>
                {i.text}
              </span>
              <button onClick={() => remove(i.id)}
                className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
