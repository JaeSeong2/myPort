import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const PanelContext = createContext(null)

/**
 * 패널 분할 상태 관리 Context
 * 좌우 패널 각각 탭 목록, 활성 탭, 활성 패널 추적 제공
 * @date 2026-05-23
 */
export function PanelProvider({ children }) {
  const [activePanel, setActivePanel] = useState('left')
  const [splitEnabled, setSplitEnabled] = useState(false)

  const [leftTabs, setLeftTabs]       = useState([])
  const [activeLeftTab, setActiveLeftTab]   = useState(null)
  const [rightTabs, setRightTabs]     = useState([])
  const [activeRightTab, setActiveRightTab] = useState(null)
  const [toast, setToast]             = useState(null)
  const toastTimer = useRef(null)

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
    setLeftTabs((prev) => [...prev, { path, label }])
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
    setRightTabs((prev) => [...prev, { path, label }])
    setActiveRightTab(path)
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
      return next
    })
  }

  const reorderRightTabs = (fromIdx, toIdx) => {
    setRightTabs((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }

  /**
   * 탭을 반대 패널로 이동 (좌→우 or 우→좌)
   * @date 2026-05-23
   */
  const crossMoveTab = (fromPanel, path, label, toIdx) => {
    if (fromPanel === 'left') {
      const newLeft = leftTabs.filter((t) => t.path !== path)
      setLeftTabs(newLeft)
      if (activeLeftTab === path)
        setActiveLeftTab(newLeft.length > 0 ? newLeft[newLeft.length - 1].path : null)

      const insertAt = toIdx != null ? Math.min(toIdx, rightTabs.length) : rightTabs.length
      const newRight = rightTabs.find((t) => t.path === path)
        ? rightTabs
        : (() => { const r = [...rightTabs]; r.splice(insertAt, 0, { path, label }); return r })()
      setRightTabs(newRight)
      setActiveRightTab(path)
      setSplitEnabled(true)
      setActivePanel('right')
    } else {
      const newRight = rightTabs.filter((t) => t.path !== path)
      if (newRight.length === 0) { setSplitEnabled(false); setActiveRightTab(null) }
      else if (activeRightTab === path) setActiveRightTab(newRight[newRight.length - 1].path)
      setRightTabs(newRight)

      const insertAt = toIdx != null ? Math.min(toIdx, leftTabs.length) : leftTabs.length
      const newLeft = leftTabs.find((t) => t.path === path)
        ? leftTabs
        : (() => { const l = [...leftTabs]; l.splice(insertAt, 0, { path, label }); return l })()
      setLeftTabs(newLeft)
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

  // 모든 탭 닫기 - 2026-05-23
  const closeAllTabs = useCallback(() => {
    setLeftTabs([])
    setActiveLeftTab(null)
    setRightTabs([])
    setActiveRightTab(null)
    setSplitEnabled(false)
    setActivePanel('left')
  }, [])

  return (
    <PanelContext.Provider value={{
      activePanel, setActivePanel,
      splitEnabled, enableSplit,
      leftTabs,  activeLeftTab,  setActiveLeftTab,  addToLeftPanel,  closeLeftTab,  reorderLeftTabs,
      rightTabs, activeRightTab, setActiveRightTab, openInRightPanel, closeRightTab, reorderRightTabs,
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
