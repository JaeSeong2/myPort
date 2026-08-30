// MES 메인 레이아웃 - 반응형 사이드바 포함 - 2026-05-24
import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar  from '../components/layout/TopBar'
import Sidebar from '../components/layout/Sidebar'
import UpdateToast from '../components/layout/UpdateToast'
import CommandPalette from '../components/layout/CommandPalette'
// import { APP_VERSION } from '../data/changelog' // 하단 바 비활성화로 임시 주석 - 2026-08-07
import { PanelProvider, usePanelContext } from '../context/PanelContext'
import { RealtimeProvider } from '../context/RealtimeContext'
import { useIsMobile }   from '../hooks/useBreakpoint'

/**
 * 메인 콘텐츠 표면 - 분할 활성 시 바깥 프레임 제거(두 카드가 셸 바탕에 직접 부양) - 2026-08-30
 * 단일 모드는 라운드 카드 프레임 유지. split 상태를 알아야 하므로 PanelProvider 내부 컴포넌트로 분리.
 */
function MainSurface() {
  const { splitEnabled } = usePanelContext()
  const isTabletDown = useIsMobile(1024) // 분할 실제 렌더 조건과 일치(<1024는 단일) - 2026-08-30
  const splitActive = splitEnabled && !isTabletDown
  return (
    <main
      className={`flex-1 min-w-0 flex flex-col overflow-hidden ${
        splitActive ? '' : 'rounded-2xl border border-theme bg-surface elev-2'
      }`}
    >
      <Outlet />
    </main>
  )
}

export default function MainPage() {
  const isMobile = useIsMobile()
  const location = useLocation()

  // 데스크탑: 기본 열림 / 모바일: 기본 닫힘
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)

  // 화면 크기 전환 시 사이드바 상태 자동 조정
  useEffect(() => {
    setSidebarOpen(!isMobile)
  }, [isMobile])

  // 모바일 라우팅 시 사이드바 자동 닫기
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname]) // eslint-disable-line

  const toggle = () => setSidebarOpen(v => !v)

  return (
    <PanelProvider>
    <RealtimeProvider>
      {/* 플로팅 패널 셸 — 영역별 라운드 카드 + 여백(바탕 base 위에 떠 있는 구조) - 2026-08-24 */}
      <div className="h-screen flex flex-col bg-base overflow-hidden p-2 gap-2 sm:p-2.5 sm:gap-2.5">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggle}
          isMobile={isMobile}
        />

        <div className="flex flex-1 overflow-hidden relative gap-2 sm:gap-2.5 min-h-0">
          {/* 모바일 사이드바 백드롭 */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <Sidebar open={sidebarOpen} isMobile={isMobile} />

          <MainSurface />
        </div>

        {/* 하단 바 — 좌측 버전 표시 - 2026-08-07 (임시 비활성화) */}
        {/* <footer className="shrink-0 h-7 flex items-center px-4 border-t border-theme bg-surface">
          <span className="text-[11px] text-muted">v{APP_VERSION}</span>
        </footer> */}

        {/* 명령 팔레트 — Ctrl/Cmd+K - 2026-08-24 */}
        <CommandPalette />

        {/* 새 버전 배포 감지 토스트 - 2026-08-07 */}
        <UpdateToast />
      </div>
    </RealtimeProvider>
    </PanelProvider>
  )
}
