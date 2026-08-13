// 자유 그리드 대시보드 훅 — react-grid-layout 기반 위젯 배치/크기(가로×세로) 관리 - 2026-07-25
// 사용자별 레이아웃(위치·크기)을 localStorage에 저장. 숨긴 위젯은 레이아웃에서 제외.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchPrefs, savePrefsSlice } from '../services/prefs'

const keyFor = (prefix, uid) => `${prefix}_${(uid || 'guest').toLowerCase()}`
const strip = (l) => ({ i: l.i, x: l.x | 0, y: l.y | 0, w: l.w, h: l.h })

// 서버에서 받은 저장 레이아웃을 현재 위젯 레지스트리 기준으로 정리 - 2026-07-28
function reconcileSaved(saved, widgets) {
  if (!Array.isArray(saved)) return null
  const known = new Set(widgets.map((w) => w.id))
  const items = saved.filter((s) => s && known.has(s.i)).map(strip)
  return items.length ? items : null
}

// 레지스트리에서 기본 레이아웃 생성(hidden 제외, x/y/w/h 사용) - 2026-07-25
function defaultLayout(widgets) {
  return widgets
    .filter((w) => !w.hidden)
    .map((w) => ({ i: w.id, x: w.x ?? 0, y: w.y ?? 0, w: w.w ?? 3, h: w.h ?? 4 }))
}

function loadLayout(prefix, uid, widgets) {
  const known = new Set(widgets.map((w) => w.id))
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(prefix, uid)))
    if (Array.isArray(saved)) {
      const items = saved.filter((s) => s && known.has(s.i)).map(strip)
      return items.length ? items : defaultLayout(widgets)
    }
  } catch { /* noop */ }
  return defaultLayout(widgets)
}

function saveLayout(prefix, uid, layout) {
  const stripped = layout.map(strip)
  try { localStorage.setItem(keyFor(prefix, uid), JSON.stringify(stripped)) } catch { /* noop */ }
  savePrefsSlice(uid, prefix, stripped) // 서버 영속화(디바운스) - 2026-07-28
}

export function useWidgetGrid(widgets, prefix) {
  const { currentUser } = useAuth()
  const uid = currentUser?.user_id
  const canEdit = !!currentUser
  const [editMode, setEditMode] = useState(false)
  const [layout, setLayout] = useState(() => loadLayout(prefix, uid, widgets))
  // 서버 복원 완료 전에는 저장 금지 — 마운트 시 RGL 자동 onLayoutChange가 서버를 덮어쓰는 것 방지 - 2026-07-28
  const hydrated = useRef(false)

  // 사용자 전환 시 로컬 캐시로 즉시 재로드 + 편집 종료 (서버 복원 전까지 저장 잠금)
  useEffect(() => {
    hydrated.current = false
    setLayout(loadLayout(prefix, uid, widgets))
    setEditMode(false)
  }, [uid, prefix]) // eslint-disable-line react-hooks/exhaustive-deps

  // 서버(원본)에서 레이아웃 로드 → 있으면 서버 우선, 없으면 로컬을 서버로 이관. 이후 저장 잠금 해제 - 2026-07-28
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const remote = await fetchPrefs(uid)
      if (cancelled) return
      const items = reconcileSaved(remote?.[prefix], widgets)
      if (items) {
        setLayout(items)
        try { localStorage.setItem(keyFor(prefix, uid), JSON.stringify(items)) } catch { /* noop */ }
      } else if (remote) {
        savePrefsSlice(uid, prefix, loadLayout(prefix, uid, widgets).map(strip)) // 최초 이관
      }
      hydrated.current = true
    })()
    return () => { cancelled = true }
  }, [uid, prefix]) // eslint-disable-line react-hooks/exhaustive-deps

  const metaOf = (id) => widgets.find((w) => w.id === id) || {}

  // RGL 레이아웃 변경(드래그·리사이즈) — 실제 변경 시에만 저장 - 2026-07-25
  const onLayoutChange = useCallback((next) => {
    const stripped = next.map(strip)
    setLayout((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(stripped)) return prev
      if (hydrated.current) saveLayout(prefix, uid, stripped) // 서버 복원 전 저장 잠금
      return stripped
    })
  }, [prefix, uid])

  const visibleIds = layout.map((l) => l.i)
  const hiddenWidgets = widgets.filter((w) => !visibleIds.includes(w.id))

  // 팔레트에서 추가 — 지정 위치 또는 맨 아래에 배치 - 2026-07-25
  const addWidget = useCallback((id, pos) => {
    const w = widgets.find((x) => x.id === id)
    if (!w) return
    setLayout((prev) => {
      if (prev.some((l) => l.i === id)) return prev
      const maxY = prev.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      const item = { i: id, x: pos?.x ?? 0, y: pos?.y ?? maxY, w: w.w ?? 3, h: w.h ?? 4 }
      const next = [...prev, item]
      saveLayout(prefix, uid, next)
      return next
    })
  }, [widgets, prefix, uid])

  // 위젯 숨김(레이아웃에서 제거) - 2026-07-25
  const removeWidget = useCallback((id) => {
    setLayout((prev) => {
      const next = prev.filter((l) => l.i !== id)
      saveLayout(prefix, uid, next)
      return next
    })
  }, [prefix, uid])

  // RGL에 넘길 레이아웃 — 레지스트리 최소/최대(그리드 단위) 주입 - 2026-07-25
  const gridLayout = layout.map((l) => {
    const m = metaOf(l.i)
    return { ...l, minW: m.minW, minH: m.minH, maxW: m.maxW, maxH: m.maxH }
  })

  return {
    canEdit, editMode, setEditMode,
    gridLayout, hiddenWidgets,
    addWidget, removeWidget, onLayoutChange,
    // 레지스트리 labelKey 반환 — 표시 시 t()로 해석(WidgetBoard) - 2026-08-13
    labelKeyOf: (id) => metaOf(id).labelKey ?? id,
    iconOf: (id) => metaOf(id).icon ?? null,
  }
}
