import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Group as PanelGroup, Panel, Separator } from 'react-resizable-panels'
import { X, Columns2, XSquare, Bookmark } from 'lucide-react'
import { menuConfig } from '../../data/menuConfig'
import { pageRegistry } from '../../data/pageRegistry'
import ErrorBoundary from '../common/ErrorBoundary'
import { usePanelContext } from '../../context/PanelContext'
import { useLanguage } from '../../context/LanguageContext'
import { useIsMobile } from '../../hooks/useBreakpoint'
import DashboardPage from '../../pages/modules/dashboard/DashboardPage'

/**
 * 메인 콘텐츠 영역 - 좌우 2패널 분할, 탭 드래그 정렬 및 패널 간 이동, 드래그 리사이즈
 * @date 2026-05-23
 */
// 경로 → 로케일 키 맵 — 패널 탭 라벨을 현재 언어로 재해석하기 위함 - 2026-08-13
const LABEL_KEY_BY_PATH = {}
;(function collect(items) {
  items?.forEach((it) => {
    if (it.path && it.labelKey) LABEL_KEY_BY_PATH[it.path] = it.labelKey
    if (it.children) collect(it.children)
  })
})(menuConfig)

export default function PanelArea() {
  // 태블릿 이하(<1024)는 분할 없이 단일 패널로 강제 — 좁은 폭에서 좌우 분할 방지 - 2026-07-28
  const isTabletDown = useIsMobile(1024)
  const location  = useLocation()
  const navigate  = useNavigate()
  const {
    activePanel, setActivePanel,
    splitEnabled, enableSplit,
    splitLayout, setSplitLayout,
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

      {splitEnabled && !isTabletDown ? (
        // 분할 패널 = base 채널 위에 떠 있는 surface 카드(개별 화면처럼) - 2026-08-30
        <PanelGroup
          orientation="horizontal"
          style={{ height: '100%' }}
          className="bg-base"
          // 저장된 분할 사이즈 복원(없으면 50:50) — 드래그 종료 시 저장 - 2026-07-28
          defaultLayout={splitLayout ?? undefined}
          onLayoutChanged={(layout) => setSplitLayout(layout)}
        >
          <Panel id="left" defaultSize={50} minSize={20}>
            <div
              className="h-full flex flex-col rounded-xl border border-theme bg-surface elev-1 overflow-hidden mr-1"
              onMouseDown={() => setActivePanel('left')}
            >
              <TabBar
                side="left"
                floating
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

          <Separator className="panel-sep" />

          <Panel id="right" defaultSize={50} minSize={20}>
            <div
              className="h-full flex flex-col rounded-xl border border-theme bg-surface elev-1 overflow-hidden ml-1"
              onMouseDown={() => setActivePanel('right')}
            >
              <TabBar
                side="right"
                floating
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
            onSplit={isTabletDown ? undefined : () => { enableSplit(); setActivePanel('right') }}
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
function TabBar({ side, tabs, activeTab, isActive, sharedDrag, onTabClick, onTabClose, onReorder, onTogglePin, onCrossMove, onClose, onSplit, onCloseAll, floating = false }) {
  const { t } = useLanguage()
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
      className={`flex items-center px-1.5 gap-1 min-h-12 shrink-0 ${floating ? 'bg-surface' : 'bg-base'}`}
      style={{ borderTop: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}` }}
      onDragOver={handleBarDragOver}
      onDrop={handleBarDrop}
    >
      <div className={`flex items-center gap-0.5 flex-1 overflow-x-auto overflow-y-hidden rounded transition-colors ${dragOverBar ? 'bg-accent-subtle' : ''}`}>
        {tabs.map((tab, idx) => {
          const active = activeTab === tab.path
          return (
          <div
            key={tab.path}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onMouseDown={(e) => { e.stopPropagation(); onTabClick(tab.path) }}
            className={`
              group relative flex items-center gap-1.5 pl-3 pr-2 h-8 rounded-lg text-xs cursor-pointer whitespace-nowrap select-none transition-colors
              ${active ? 'bg-elevated text-primary font-medium' : 'text-secondary hover-text-primary hover-bg-elevated'}
              ${dragOverIdx === idx && sharedDrag.current?.side !== side ? 'ring-1 ring-accent' : ''}
            `}
            style={{ opacity: sharedDrag.current?.path === tab.path ? 0.4 : 1 }}
          >
            <span className="truncate max-w-40">
              {LABEL_KEY_BY_PATH[tab.path] ? t(LABEL_KEY_BY_PATH[tab.path]) : tab.label}
            </span>

            {/* 고정 토글 — 고정 시 항상 표시(amber), 아니면 hover 시 노출 - 2026-07-24 */}
            <button
              onMouseDown={(e) => { e.stopPropagation(); onTogglePin?.(tab.path) }}
              title={tab.pinned ? t('panel.pinOff') : t('panel.pin')}
              className={`shrink-0 rounded p-0.5 transition-colors cursor-pointer
                ${tab.pinned ? 'opacity-100' : 'hidden group-hover:inline-flex text-muted hover-text-primary'}`}
              style={tab.pinned ? { color: 'rgba(251,191,36,0.5)' } : undefined}
            >
              <Bookmark size={12} fill={tab.pinned ? 'currentColor' : 'none'} />
            </button>

            {/* 닫기 — 고정 아니면 활성/hover 시 노출 - 2026-07-24 */}
            {!tab.pinned && (
              <button
                onMouseDown={(e) => { e.stopPropagation(); onTabClose(tab.path) }}
                className={`shrink-0 rounded p-0.5 text-muted hover-text-danger transition-colors cursor-pointer
                  ${active ? 'inline-flex' : 'hidden group-hover:inline-flex'}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
          )
        })}
      </div>

      {/* 우측 액션 — 탭 목록과 얇은 구분선으로 분리 - 2026-08-30 */}
      {(onCloseAll || onSplit || onClose) && (
        <div className="flex items-center gap-0.5 pl-1.5 ml-1 border-l border-subtle-theme shrink-0">
          {onCloseAll && (
            <button
              onClick={onCloseAll}
              title={t('panel.closeAll')}
              className="p-1.5 rounded-md text-muted hover-text-danger hover-bg-elevated transition-colors cursor-pointer"
            >
              <XSquare size={15} />
            </button>
          )}
          {onSplit && (
            <button
              onClick={onSplit}
              title={t('panel.split')}
              className="p-1.5 rounded-md text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer"
            >
              <Columns2 size={15} />
            </button>
          )}
          {onClose && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); onClose() }}
              title={t('panel.splitClose')}
              className="p-1.5 rounded-md text-muted hover-text-danger hover-bg-elevated transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function PageContent({ path }) {
  const Component = (!path ? DashboardPage : pageRegistry[path]) ?? DashboardPage
  // 페이지 단위 에러 경계 — 한 페이지 크래시가 앱 전체를 백색 화면으로 만들지 않도록.
  // key={path} 로 페이지 전환 시 경계 상태 초기화 - 2026-08-24
  return (
    <ErrorBoundary key={path}>
      <Component />
    </ErrorBoundary>
  )
}
