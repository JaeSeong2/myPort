// 상단 바 - 2026-05-23
import { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen, Sun, Moon, ChevronDown, Check, Search } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import NotificationCenter from './NotificationCenter'

export default function TopBar({ sidebarOpen, onToggleSidebar, isMobile = false }) {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLanguage, t } = useLanguage()
  const { currentUser, users, switchUser, dropdownOpen, setDropdownOpen, dropRef } = useAuth()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatted = now.toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })

  const iconBtn = 'p-1.5 rounded-lg text-secondary hover-text-primary hover-bg-elevated transition-colors cursor-pointer'

  const roleBadgeClass = currentUser.role === 'ADMIN'
    ? 'bg-accent text-white'
    : 'bg-elevated text-muted border border-theme'

  return (
    <header className="h-14 bg-surface border border-theme rounded-xl flex items-center shrink-0 elev-1">
      {/* 브랜드 영역 - 데스크탑은 사이드바 너비 맞춤, 모바일은 컴팩트 */}
      <div className={`flex items-center shrink-0 transition-all duration-200
        ${isMobile
          ? 'w-14 justify-center'
          : `border-r border-theme ${sidebarOpen ? 'w-64 px-3 gap-2.5' : 'w-14 justify-center'}`
        }`}
      >
        <button onClick={onToggleSidebar} className={iconBtn}>
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
        {sidebarOpen && !isMobile && (
          <>
            <span className="flex-1" />
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-accent shrink-0">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="flex-1" />
            <span className="text-xs px-2 py-0.5 rounded-full border border-accent text-accent font-medium shrink-0"
              style={{ fontSize: '10px' }}>
              DEMO
            </span>
          </>
        )}
      </div>

      {/* 콘텐츠 영역 - 사이드바 우측 라인에서 시작 */}
      <div className="flex-1 flex items-center justify-between px-4 min-w-0">
        {/* 사용자 모드 선택 드롭다운 */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer hover-bg-elevated"
          >
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${roleBadgeClass}`}>
              {currentUser.role === 'ADMIN' ? '관리자' : '일반'}
            </span>
            <span className="text-primary hidden sm:block">{currentUser.name}</span>
            <ChevronDown size={12} className="text-muted" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 bg-surface border border-theme rounded-lg shadow-lg z-50 min-w-44 py-1">
              <div className="px-3 py-1.5 text-xs text-muted border-b border-theme mb-1">사용자 전환</div>
              {users.map(user => (
                <button
                  key={user._id}
                  onClick={() => switchUser(user)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-primary hover-bg-elevated transition-colors cursor-pointer"
                >
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                    user.role === 'ADMIN' ? 'bg-accent text-white' : 'bg-elevated text-muted border border-theme'
                  }`}>
                    {user.role === 'ADMIN' ? '관리자' : '일반'}
                  </span>
                  <span className="truncate">{user.name}</span>
                  {currentUser._id === user._id && (
                    <Check size={13} className="text-accent ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 우측: 시간 + 언어 + 테마 + 알림 */}
        <div className="flex items-center gap-1">
          {/* 명령 팔레트 트리거 — Ctrl/Cmd+K - 2026-08-24 */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('command-palette:open'))}
            title={t('cmd.jump')}
            className="hover-lift hidden md:flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 mr-2 rounded-lg border border-theme text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer"
          >
            <Search size={13} className="shrink-0" />
            <span className="text-xs">{t('cmd.placeholder')}</span>
            <kbd className="text-[10px] border border-theme rounded px-1 py-0.5 ml-1">Ctrl K</kbd>
          </button>

          <span className="text-secondary text-xs font-mono mr-3 hidden lg:block">{formatted}</span>

          <button
            onClick={() => setLanguage(lang === 'ko' ? 'en' : 'ko')}
            className={`${iconBtn} text-xs font-semibold w-8 h-8 flex items-center justify-center`}
            title={lang === 'ko' ? 'Switch to English' : '한글로 변경'}
          >
            {lang === 'ko' ? 'EN' : 'KO'}
          </button>

          <button onClick={toggleTheme} className={iconBtn} title={theme === 'dark' ? '라이트 모드' : '다크 모드'}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {/* 디자인 스타일(스킨) 선택기는 숨김 — 현재 스타일 고정. 스킨 시스템(ThemeContext/index.css)은 유지 - 2026-08-24 */}

          <NotificationCenter />
        </div>
      </div>
    </header>
  )
}
