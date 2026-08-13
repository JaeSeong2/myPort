// MES 메인 레이아웃 - 반응형 사이드바 포함 - 2026-05-24
import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar  from '../components/layout/TopBar'
import Sidebar from '../components/layout/Sidebar'
import UpdateToast from '../components/layout/UpdateToast'
// import { APP_VERSION } from '../data/changelog' // 하단 바 비활성화로 임시 주석 - 2026-08-07
import { PanelProvider } from '../context/PanelContext'
import { RealtimeProvider } from '../context/RealtimeContext'
import { useIsMobile }   from '../hooks/useBreakpoint'

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
      <div className="h-screen flex flex-col bg-base overflow-hidden">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggle}
          isMobile={isMobile}
        />

        <div className="flex flex-1 overflow-hidden relative">
          {/* 모바일 사이드바 백드롭 */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <Sidebar open={sidebarOpen} isMobile={isMobile} />

          <main className="flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </main>
        </div>

        {/* 하단 바 — 좌측 버전 표시 - 2026-08-07 (임시 비활성화) */}
        {/* <footer className="shrink-0 h-7 flex items-center px-4 border-t border-theme bg-surface">
          <span className="text-[11px] text-muted">v{APP_VERSION}</span>
        </footer> */}

        {/* 새 버전 배포 감지 토스트 - 2026-08-07 */}
        <UpdateToast />
      </div>
    </RealtimeProvider>
    </PanelProvider>
  )
}
