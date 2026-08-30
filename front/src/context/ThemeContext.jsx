import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

// 디자인 방향(스킨) — index.css의 [data-skin] 토큰 세트와 1:1 - 2026-08-24
export const SKINS = ['current', 'carbon', 'linear']

/**
 * 테마 전역 상태 — 다크/라이트(theme) + 디자인 방향(skin) 2축 관리
 * theme → data-theme, skin → data-skin 을 루트에 부여 (조합 6가지)
 * @date 2026-05-23 / 스킨 축 추가 2026-08-24
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('mes-theme-v2') || 'light'
  )
  const [skin, setSkinState] = useState(
    () => localStorage.getItem('mes-skin') || 'current'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mes-theme-v2', theme)
  }, [theme])

  // 디자인 방향 적용 — 루트 data-skin 속성으로 토큰 전환 - 2026-08-24
  useEffect(() => {
    document.documentElement.setAttribute('data-skin', skin)
    localStorage.setItem('mes-skin', skin)
  }, [skin])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  const setSkin = (s) => setSkinState(SKINS.includes(s) ? s : 'current')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, skin, setSkin }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
