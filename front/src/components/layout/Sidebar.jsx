// 좌측 사이드바 - 트리 구조 메뉴, 접기/펼치기, 활성 패널 기반 네비게이션 - 2026-05-23
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, Hammer, Printer } from 'lucide-react'
import { menuConfig } from '../../data/menuConfig'
import { usePanelContext } from '../../context/PanelContext'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import DocOutputModal from '../print/DocOutputModal'

export default function Sidebar({ open, isMobile = false }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { t }     = useLanguage()
  const { hasMenu } = useAuth()
  const {
    activePanel, setActivePanel,
    splitEnabled,
    leftTabs,  setActiveLeftTab,
    rightTabs, setActiveRightTab,
    openInRightPanel,
  } = usePanelContext()
  const [expanded, setExpanded] = useState({ 'work-order': true })
  const [docOpen, setDocOpen]   = useState(false) // 문서 출력 팝업 - 2026-07-24

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const isActive = (path) => location.pathname === path

  /**
   * 사이드바 메뉴 네비게이션 - 중복 화면 포커스, 활성 패널 기반 라우팅
   * @date 2026-05-23
   */
  const handleNavigate = (path, label) => {
    if (path === '/main/dashboard') {
      setActivePanel('left')
      setActiveLeftTab(null)
      navigate(path)
      return
    }

    const inLeft  = splitEnabled && leftTabs.find((t) => t.path === path)
    const inRight = splitEnabled && rightTabs.find((t) => t.path === path)

    if (inLeft)  { setActivePanel('left');  setActiveLeftTab(path);  navigate(path); return }
    if (inRight) { setActivePanel('right'); setActiveRightTab(path); return }

    if (activePanel === 'right') openInRightPanel(path, label)
    else navigate(path)
  }

  const label = (item) => t(item.labelKey) || item.label

  // 권한에 따라 메뉴 필터링
  const visibleMenu = menuConfig
    .map(item => {
      if (!item.children) return hasMenu(item.id) ? item : null
      const children = item.children.filter(c => hasMenu(c.id))
      return children.length > 0 ? { ...item, children } : null
    })
    .filter(Boolean)

  return (
    <>
    <aside
      className={`
        bg-surface border-r border-theme flex flex-col overflow-hidden
        ${isMobile
          ? `fixed inset-y-0 left-0 z-50 h-full w-64 shrink-0
             transition-transform duration-200
             ${open ? 'translate-x-0' : '-translate-x-full'}`
          : `relative shrink-0 transition-all duration-200
             ${open ? 'w-64' : 'w-14'}`
        }
      `}
    >
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {visibleMenu.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => {
                if (item.children) { if (open) toggleExpand(item.id) }
                else handleNavigate(item.path, label(item))
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm transition-colors cursor-pointer
                ${isActive(item.path)
                  ? 'bg-accent-subtle text-accent'
                  : 'text-secondary hover-text-primary hover-bg-elevated'}
              `}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <item.icon size={17} className="shrink-0" />
              {(open || isMobile) && (
                <>
                  <span className="flex-1 text-left truncate text-xs font-medium">{label(item)}</span>
                  {item.children && (
                    expanded[item.id]
                      ? <ChevronDown size={13} className="text-muted" />
                      : <ChevronRight size={13} className="text-muted" />
                  )}
                </>
              )}
            </button>

            {(open || isMobile) && item.children && expanded[item.id] && (
              <div className="ml-5 pl-3 border-l border-subtle-theme my-0.5">
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleNavigate(child.path, label(child))}
                    className={`
                      w-full flex items-center gap-1.5 px-2 py-1.5 text-xs transition-colors cursor-pointer rounded-md
                      ${isActive(child.path)
                        ? 'text-accent bg-accent-subtle font-medium'
                        : 'text-muted hover-text-primary hover-bg-elevated'}
                    `}
                  >
                    <span className="flex-1 truncate text-left">{label(child)}</span>
                    {child.wip && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
                        style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--warning)' }}>
                        <Hammer size={9} />
                        준비중
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 하단 고정: 문서 출력 팝업 진입 - 2026-07-24 */}
      <div className="border-t border-theme p-2 shrink-0">
        <button
          onClick={() => setDocOpen(true)}
          title="문서 출력"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-secondary hover-text-primary hover-bg-elevated transition-colors cursor-pointer"
        >
          <Printer size={17} className="shrink-0" />
          {(open || isMobile) && <span className="text-xs font-medium">문서 출력</span>}
        </button>
      </div>
    </aside>

    <DocOutputModal open={docOpen} onClose={() => setDocOpen(false)} />
    </>
  )
}
