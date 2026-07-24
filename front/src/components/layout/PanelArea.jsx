import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Group as PanelGroup, Panel, Separator } from 'react-resizable-panels'
import { X, Columns2, XSquare, Bookmark } from 'lucide-react'
import { menuConfig } from '../../data/menuConfig'
import { pageRegistry } from '../../data/pageRegistry'
import { usePanelContext } from '../../context/PanelContext'
import { useIsMobile } from '../../hooks/useBreakpoint'
import DashboardPage from '../../pages/modules/dashboard/DashboardPage'

/**
 * 메인 콘텐츠 영역 - 좌우 2패널 분할, 탭 드래그 정렬 및 패널 간 이동, 드래그 리사이즈
 * @date 2026-05-23
 */
export default function PanelArea() {
  const isMobile  = useIsMobile()
  const location  = useLocation()
  const navigate  = useNavigate()
  const {
    activePanel, setActivePanel,
    splitEnabled, enableSplit,
    leftTabs,  activeLeftTab,  setActiveLeftTab,  addToLeftPanel,  closeLeftTab,  reorderLeftTabs,  togglePinLeft,
    rightTabs, activeRightTab, setActiveRightTab, closeRightTab, reorderRightTabs, togglePinRight, crossMoveTab, closeSplit,
    closeAllTabs,
    toast,
  } = usePanelContext()

  // 고정 제외 닫을 탭이 하나라도 있을 때만 '모두 닫기' 노출 - 2026-07-24
  const hasUnpinned = [...leftTabs, ...rightTabs].some((t) => !t.pinned)

  // 두 TabBar 간 드래그 정보 공유
  const sharedDrag = useRef(null)
  // { side: 'left'|'right', idx: number, path: string, label: string }

  const getLabelByPath = (path) => {
    for (const item of menuConfig) {
      if (item.path === path) return item.label
      if (item.children) {
        const child = item.children.find((c) => c.path === path)
        if (child) return child.label
      }
    }
    return path
  }

  useEffect(() => {
    const path = location.pathname
    if (path === '/main' || path === '/main/' || path === '/main/dashboard') return
    addToLeftPanel(path, getLabelByPath(path))
  }, [location.pathname])

  const handleCloseLeftTab = (path) => {
    const remaining = leftTabs.filter((t) => t.path !== path)
    closeLeftTab(path)
    if (activeLeftTab === path) {
      navigate(remaining.length > 0 ? remaining[remaining.length - 1].path : '/main/dashboard')
    }
  }

  const handleLeftTabClick = (path) => {
    setActiveLeftTab(path)
    navigate(path)
    setActivePanel('left')
  }

  /**
   * 크로스 패널 탭 이동 처리 - 이동 후 네비게이션 동기화
   * @date 2026-05-23
   */
  const handleCloseAll = () => {
    // 고정 탭은 유지 → 현재 활성이 고정이면 그대로, 아니면 첫 고정 탭(없으면 대시보드)으로 이동 - 2026-07-24
    const leftPinned = leftTabs.filter((t) => t.pinned)
    const target = leftPinned.some((t) => t.path === activeLeftTab)
      ? activeLeftTab
      : (leftPinned[0]?.path ?? '/main/dashboard')
    closeAllTabs()
    navigate(target)
  }

  const handleCrossMove = (fromSide, path, label, toIdx) => {
    // 좌측 활성 탭을 우측으로 이동할 때 → 남은 좌측 탭으로 navigate
    if (fromSide === 'left' && activeLeftTab === path) {
      const remaining = leftTabs.filter((t) => t.path !== path)
      if (remaining.length > 0) navigate(remaining[remaining.length - 1].path)
    }
    // 우측에서 좌측으로 이동 → 해당 경로로 navigate
    if (fromSide === 'right') navigate(path)

    crossMoveTab(fromSide, path, label, toIdx)
  }

  return (
    <div className="h-full flex flex-col relative">
      {toast && (
        <div className="absolute top-3 left-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium whitespace-nowrap"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--warning)',
              color: 'var(--text-primary)',
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="var(--warning)" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="13"/>
              <circle cx="12" cy="16.5" r="0.8" fill="var(--warning)" stroke="none"/>
            </svg>
            {toast}
          </div>
        </div>
      )}

      {splitEnabled ? (
        <PanelGroup orientation="horizontal" style={{ height: '100%' }}>
          <Panel defaultSize={50} minSize={20}>
            <div className="h-full flex flex-col" onMouseDown={() => setActivePanel('left')}>
              <TabBar
                side="left"
                tabs={leftTabs}
                activeTab={activeLeftTab}
                isActive={activePanel === 'left'}
                sharedDrag={sharedDrag}
                onTabClick={handleLeftTabClick}
                onTabClose={handleCloseLeftTab}
                onReorder={reorderLeftTabs}
                onTogglePin={togglePinLeft}
                onCrossMove={handleCrossMove}
                onCloseAll={hasUnpinned ? handleCloseAll : undefined}
              />
              <div className="flex-1 overflow-auto bg-base">
                <PageContent path={activeLeftTab} />
              </div>
            </div>
          </Panel>

          <Separator
            style={{ width: '4px', backgroundColor: 'var(--text-muted)', cursor: 'col-resize', flexShrink: 0 }}
          />

          <Panel defaultSize={50} minSize={20}>
            <div className="h-full flex flex-col" onMouseDown={() => setActivePanel('right')}>
              <TabBar
                side="right"
                tabs={rightTabs}
                activeTab={activeRightTab}
                isActive={activePanel === 'right'}
                sharedDrag={sharedDrag}
                onTabClick={(path) => { setActiveRightTab(path); setActivePanel('right') }}
                onTabClose={closeRightTab}
                onReorder={reorderRightTabs}
                onTogglePin={togglePinRight}
                onCrossMove={handleCrossMove}
                onClose={closeSplit}
              />
              <div className="flex-1 overflow-auto bg-base">
                <PageContent path={activeRightTab} />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        <div className="h-full flex flex-col">
          <TabBar
            side="left"
            tabs={leftTabs}
            activeTab={activeLeftTab}
            isActive
            sharedDrag={sharedDrag}
            onTabClick={handleLeftTabClick}
            onTabClose={handleCloseLeftTab}
            onReorder={reorderLeftTabs}
            onTogglePin={togglePinLeft}
            onCrossMove={handleCrossMove}
            onSplit={isMobile ? undefined : () => { enableSplit(); setActivePanel('right') }}
            onCloseAll={hasUnpinned ? handleCloseAll : undefined}
          />
          <div className="flex-1 overflow-auto bg-base">
            <PageContent path={activeLeftTab} />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 탭바 - 같은 패널 내 정렬, 반대 패널로 드래그 이동 지원
 * @date 2026-05-23
 */
function TabBar({ side, tabs, activeTab, isActive, sharedDrag, onTabClick, onTabClose, onReorder, onTogglePin, onCrossMove, onClose, onSplit, onCloseAll }) {
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [dragOverBar, setDragOverBar] = useState(false)

  const handleDragStart = (e, idx) => {
    sharedDrag.current = { side, idx, path: tabs[idx].path, label: tabs[idx].label }
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
    setDragOverBar(false)
  }

  const handleDrop = (e, toIdx) => {
    e.preventDefault()
    e.stopPropagation()
    if (!sharedDrag.current) return

    const { side: fromSide, idx: fromIdx, path, label } = sharedDrag.current

    if (fromSide === side) {
      if (fromIdx !== toIdx) onReorder(fromIdx, toIdx)
    } else {
      onCrossMove(fromSide, path, label, toIdx)
    }

    sharedDrag.current = null
    setDragOverIdx(null)
    setDragOverBar(false)
  }

  // 탭 뒤 빈 영역에 드롭 → 맨 끝에 추가
  const handleBarDragOver = (e) => {
    if (!sharedDrag.current) return
    if (sharedDrag.current.side === side) return // 같은 패널 내 빈 영역 무시
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverBar(true)
    setDragOverIdx(null)
  }

  const handleBarDrop = (e) => {
    e.preventDefault()
    if (!sharedDrag.current || sharedDrag.current.side === side) return
    const { side: fromSide, path, label } = sharedDrag.current
    onCrossMove(fromSide, path, label, tabs.length)
    sharedDrag.current = null
    setDragOverBar(false)
  }

  const handleDragEnd = () => {
    sharedDrag.current = null
    setDragOverIdx(null)
    setDragOverBar(false)
  }

  return (
    <div
      className="flex items-center bg-surface border-b border-theme px-2 gap-1 min-h-15 shrink-0"
      style={{ borderTop: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}` }}
      onDragOver={handleBarDragOver}
      onDrop={handleBarDrop}
    >
      <div className={`flex items-center gap-0.5 flex-1 overflow-x-auto rounded transition-colors ${dragOverBar ? 'bg-accent-subtle' : ''}`}>
        {tabs.map((tab, idx) => (
          <div
            key={tab.path}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onMouseDown={(e) => { e.stopPropagation(); onTabClick(tab.path) }}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-md text-xs cursor-pointer whitespace-nowrap select-none transition-all
              ${activeTab === tab.path ? 'bg-elevated text-primary' : 'text-muted hover-text-primary hover-bg-elevated'}
              ${dragOverIdx === idx && sharedDrag.current?.side !== side ? 'ring-1 ring-accent' : ''}
            `}
            style={{ opacity: sharedDrag.current?.path === tab.path ? 0.4 : 1 }}
          >
            {tab.label}
            {/* 탭 고정/해제 토글 — 고정 시 accent 색 채움 - 2026-07-24 */}
            <button
              onMouseDown={(e) => { e.stopPropagation(); onTogglePin?.(tab.path) }}
              title={tab.pinned ? '고정 해제' : '탭 고정'}
              className={`transition-colors cursor-pointer rounded p-0.5 ${tab.pinned ? '' : 'text-muted hover-text-primary'}`}
              style={tab.pinned ? { color: 'rgba(251,191,36,0.5)' } : undefined}
            >
              <Bookmark size={13} fill={tab.pinned ? 'currentColor' : 'none'} />
            </button>
            {/* 고정 탭은 X 숨김 → 실수 닫기 방지 - 2026-07-24 */}
            {!tab.pinned && (
              <button
                onMouseDown={(e) => { e.stopPropagation(); onTabClose(tab.path) }}
                className="hover-text-danger transition-colors cursor-pointer rounded p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {onCloseAll && (
        <button
          onClick={onCloseAll}
          title="고정 제외 모두 닫기"
          className="p-1.5 rounded-md text-muted hover-text-danger hover-bg-elevated transition-colors shrink-0 cursor-pointer"
        >
          <XSquare size={15} />
        </button>
      )}
      {onSplit && (
        <button
          onClick={onSplit}
          title="화면 분할"
          className="p-1.5 rounded-md text-muted hover-text-primary hover-bg-elevated transition-colors shrink-0 cursor-pointer"
        >
          <Columns2 size={15} />
        </button>
      )}
      {onClose && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); onClose() }}
          title="분할 닫기"
          className="p-1 rounded-md text-muted hover-text-danger transition-colors cursor-pointer shrink-0"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function PageContent({ path }) {
  if (!path) return <DashboardPage />
  const Component = pageRegistry[path]
  return Component ? <Component /> : <DashboardPage />
}
