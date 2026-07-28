import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { fetchPrefs, savePrefsSlice } from '../services/prefs'

// 서버 저장 슬라이스 키 — 사용자 환경설정 문서 내 필드명 - 2026-07-28
const PANELS_KEY = 'mes_panels'

const PanelContext = createContext(null)

// 사용자별 탭 상태 저장 키 — 공용 PC에서 사용자 간 탭 격리 - 2026-07-06
const panelKey = (userId) => `mes_panels_${(userId ?? 'guest').toString().toLowerCase()}`

// localStorage에서 저장된 패널 상태 로드 (없거나 파싱 실패 시 빈 객체) - 2026-07-06
const loadPanels = (userId) => {
  try { return JSON.parse(localStorage.getItem(panelKey(userId))) ?? {} }
  catch { return {} }
}

// 현재 패널 상태를 사용자 키에 저장 - 2026-07-06
const savePanels = (userId, state) => {
  try { localStorage.setItem(panelKey(userId), JSON.stringify(state)) }
  catch {}
}

// path 기준 중복 탭 제거 — 복원 시 기존에 저장된 중복 정리 및 안전장치 - 2026-07-06
const dedupeTabs = (tabs) => {
  const seen = new Set()
  return (Array.isArray(tabs) ? tabs : []).filter(
    (t) => t && t.path && !seen.has(t.path) && seen.add(t.path)
  )
}

// 고정(pinned) 탭을 앞으로 정렬 — 그룹 내 상대순서는 유지(안정 정렬) - 2026-07-24
const sortPinned = (tabs) => [...tabs].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

/**
 * 패널 분할 상태 관리 Context
 * 좌우 패널 각각 탭 목록, 활성 탭, 활성 패널 추적 제공
 * 탭 상태를 사용자별 localStorage에 영속화 → 새로고침·브라우저 종료 후에도 복원
 * @date 2026-05-23 (영속화 추가 2026-07-06)
 */
export function PanelProvider({ children }) {
  const { currentUser } = useAuth()
  const uid = (currentUser?.user_id ?? 'guest').toLowerCase()

  // 최초 마운트 시 현재 사용자의 저장된 탭 상태로 복원 - 2026-07-06
  const _init = loadPanels(uid)

  const [activePanel, setActivePanel] = useState(_init.activePanel ?? 'left')
  const [splitEnabled, setSplitEnabled] = useState(_init.splitEnabled ?? false)

  const [leftTabs, setLeftTabs]       = useState(sortPinned(dedupeTabs(_init.leftTabs)))
  const [activeLeftTab, setActiveLeftTab]   = useState(_init.activeLeftTab ?? null)
  const [rightTabs, setRightTabs]     = useState(sortPinned(dedupeTabs(_init.rightTabs)))
  const [activeRightTab, setActiveRightTab] = useState(_init.activeRightTab ?? null)
  // 분할 패널 사이즈(구분선 위치) — { left, right } 퍼센트. null이면 기본 50:50 - 2026-07-28
  const [splitLayout, setSplitLayout] = useState(_init.splitLayout ?? null)
  const [toast, setToast]             = useState(null)
  const toastTimer = useRef(null)

  // 현재 로드된 사용자 키 추적 — 저장 시 이 키를 사용해 사용자 전환 중 오염 방지 - 2026-07-06
  const loadedUid = useRef(uid)

  // 서버 복원 완료 전에는 저장 금지 — 초기 로컬 기본값이 서버를 덮어쓰는 것 방지 - 2026-07-28
  const hydrated = useRef(false)

  // 저장된 블롭을 현재 상태에 적용(로컬·서버 공통) - 2026-07-28
  const applyPanels = (data) => {
    setLeftTabs(sortPinned(dedupeTabs(data.leftTabs)))
    setRightTabs(sortPinned(dedupeTabs(data.rightTabs)))
    setActiveLeftTab(data.activeLeftTab ?? null)
    setActiveRightTab(data.activeRightTab ?? null)
    setSplitEnabled(data.splitEnabled ?? false)
    setActivePanel(data.activePanel ?? 'left')
    setSplitLayout(data.splitLayout ?? null)
  }

  // 사용자 전환 시 로컬 캐시로 즉시 교체(즉시 렌더) — 서버 복원 전까지 저장 잠금 - 2026-07-06
  useEffect(() => {
    if (loadedUid.current === uid) return
    loadedUid.current = uid
    hydrated.current = false
    applyPanels(loadPanels(uid))
  }, [uid])

  // 서버(원본)에서 로드 → 있으면 서버 우선 적용, 없으면 로컬을 서버로 이관. 이후 저장 잠금 해제 - 2026-07-28
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const remote = await fetchPrefs(uid)
      if (cancelled) return
      const p = remote?.[PANELS_KEY]
      if (p && typeof p === 'object') {
        applyPanels(p)
        savePanels(uid, p) // 로컬 캐시 동기화
      } else if (remote) {
        savePrefsSlice(uid, PANELS_KEY, loadPanels(uid)) // 서버에 없음 → 최초 이관
      }
      hydrated.current = true
    })()
    return () => { cancelled = true }
  }, [uid])

  // 탭 상태 변경 시 로컬 캐시 + 서버에 영속화 (새로고침·기기 변경 후에도 복원) - 2026-07-28
  useEffect(() => {
    if (!hydrated.current) return // 서버 복원 전 저장 잠금
    const blob = { leftTabs, rightTabs, activeLeftTab, activeRightTab, splitEnabled, activePanel, splitLayout }
    savePanels(loadedUid.current, blob)
    savePrefsSlice(loadedUid.current, PANELS_KEY, blob)
  }, [leftTabs, rightTabs, activeLeftTab, activeRightTab, splitEnabled, activePanel, splitLayout])

  const showToast = useCallback((msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const TAB_LIMIT = 10

  const addToLeftPanel = (path, label) => {
    if (leftTabs.find((t) => t.path === path)) {
      setActiveLeftTab(path)
      return
    }
    if (leftTabs.length + rightTabs.length >= TAB_LIMIT) {
      showToast(`탭은 최대 ${TAB_LIMIT}개까지 열 수 있습니다. 기존 탭을 닫고 다시 시도하세요.`)
      return
    }
    // StrictMode 이중 호출·중복 클릭에도 안전하도록 업데이터 내부에서 중복 검사 - 2026-07-06
    // 신규 탭은 미고정 → 고정 탭 뒤에 배치 - 2026-07-24
    setLeftTabs((prev) => prev.some((t) => t.path === path) ? prev : sortPinned([...prev, { path, label }]))
    setActiveLeftTab(path)
  }

  const closeLeftTab = (path) => {
    setLeftTabs((prev) => {
      const next = prev.filter((t) => t.path !== path)
      if (activeLeftTab === path) {
        setActiveLeftTab(next.length > 0 ? next[next.length - 1].path : null)
      }
      return next
    })
  }

  const openInRightPanel = (path, label) => {
    if (rightTabs.find((t) => t.path === path)) {
      setActiveRightTab(path)
      return
    }
    if (leftTabs.length + rightTabs.length >= TAB_LIMIT) {
      showToast(`탭은 최대 ${TAB_LIMIT}개까지 열 수 있습니다. 기존 탭을 닫고 다시 시도하세요.`)
      return
    }
    setSplitEnabled(true)
    // StrictMode 이중 호출·중복 클릭에도 안전하도록 업데이터 내부에서 중복 검사 - 2026-07-06
    // 신규 탭은 미고정 → 고정 탭 뒤에 배치 - 2026-07-24
    setRightTabs((prev) => prev.some((t) => t.path === path) ? prev : sortPinned([...prev, { path, label }]))
    setActiveRightTab(path)
  }

  // 탭 고정/해제 토글 — 고정 시 앞쪽 정렬, 일괄 닫기에서 보호 - 2026-07-24
  const togglePinLeft = (path) => {
    setLeftTabs((prev) => sortPinned(prev.map((t) => t.path === path ? { ...t, pinned: !t.pinned } : t)))
  }
  const togglePinRight = (path) => {
    setRightTabs((prev) => sortPinned(prev.map((t) => t.path === path ? { ...t, pinned: !t.pinned } : t)))
  }

  const closeRightTab = (path) => {
    setRightTabs((prev) => {
      const next = prev.filter((t) => t.path !== path)
      if (next.length === 0) {
        setSplitEnabled(false)
        setActiveRightTab(null)
        setActivePanel('left')
      } else if (activeRightTab === path) {
        setActiveRightTab(next[next.length - 1].path)
      }
      return next
    })
  }

  const reorderLeftTabs = (fromIdx, toIdx) => {
    setLeftTabs((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return sortPinned(next) // 드래그 정렬 후에도 고정 탭은 앞쪽 유지 - 2026-07-24
    })
  }

  const reorderRightTabs = (fromIdx, toIdx) => {
    setRightTabs((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return sortPinned(next) // 드래그 정렬 후에도 고정 탭은 앞쪽 유지 - 2026-07-24
    })
  }

  /**
   * 탭을 반대 패널로 이동 (좌→우 or 우→좌)
   * @date 2026-05-23
   */
  const crossMoveTab = (fromPanel, path, label, toIdx) => {
    if (fromPanel === 'left') {
      const pinned = !!leftTabs.find((t) => t.path === path)?.pinned // 이동해도 고정 상태 유지 - 2026-07-24
      const newLeft = leftTabs.filter((t) => t.path !== path)
      setLeftTabs(newLeft)
      if (activeLeftTab === path)
        setActiveLeftTab(newLeft.length > 0 ? newLeft[newLeft.length - 1].path : null)

      const insertAt = toIdx != null ? Math.min(toIdx, rightTabs.length) : rightTabs.length
      const newRight = rightTabs.find((t) => t.path === path)
        ? rightTabs
        : (() => { const r = [...rightTabs]; r.splice(insertAt, 0, { path, label, pinned }); return r })()
      setRightTabs(sortPinned(newRight))
      setActiveRightTab(path)
      setSplitEnabled(true)
      setActivePanel('right')
    } else {
      const pinned = !!rightTabs.find((t) => t.path === path)?.pinned // 이동해도 고정 상태 유지 - 2026-07-24
      const newRight = rightTabs.filter((t) => t.path !== path)
      if (newRight.length === 0) { setSplitEnabled(false); setActiveRightTab(null) }
      else if (activeRightTab === path) setActiveRightTab(newRight[newRight.length - 1].path)
      setRightTabs(newRight)

      const insertAt = toIdx != null ? Math.min(toIdx, leftTabs.length) : leftTabs.length
      const newLeft = leftTabs.find((t) => t.path === path)
        ? leftTabs
        : (() => { const l = [...leftTabs]; l.splice(insertAt, 0, { path, label, pinned }); return l })()
      setLeftTabs(sortPinned(newLeft))
      setActiveLeftTab(path)
      setActivePanel('left')
    }
  }

  const enableSplit = () => setSplitEnabled(true)

  const closeSplit = () => {
    setSplitEnabled(false)
    setRightTabs([])
    setActiveRightTab(null)
    setActivePanel('left')
  }

  // 고정 제외 모든 탭 닫기 — 고정 탭은 보호(유지) - 2026-07-24
  const closeAllTabs = () => {
    const leftPinned  = leftTabs.filter((t) => t.pinned)
    const rightPinned = rightTabs.filter((t) => t.pinned)
    setLeftTabs(leftPinned)
    setActiveLeftTab(
      leftPinned.some((t) => t.path === activeLeftTab)
        ? activeLeftTab
        : (leftPinned.length > 0 ? leftPinned[0].path : null)
    )
    setRightTabs(rightPinned)
    if (rightPinned.length === 0) {
      setSplitEnabled(false)
      setActiveRightTab(null)
      setActivePanel('left')
    } else if (!rightPinned.some((t) => t.path === activeRightTab)) {
      setActiveRightTab(rightPinned[0].path)
    }
  }

  return (
    <PanelContext.Provider value={{
      activePanel, setActivePanel,
      splitEnabled, enableSplit,
      splitLayout, setSplitLayout,
      leftTabs,  activeLeftTab,  setActiveLeftTab,  addToLeftPanel,  closeLeftTab,  reorderLeftTabs,  togglePinLeft,
      rightTabs, activeRightTab, setActiveRightTab, openInRightPanel, closeRightTab, reorderRightTabs, togglePinRight,
      crossMoveTab,
      closeSplit,
      closeAllTabs,
      toast, showToast,
    }}>
      {children}
    </PanelContext.Provider>
  )
}

export const usePanelContext = () => useContext(PanelContext)
