import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

/**
 * 다크/라이트 테마 전역 상태 관리 Context
 * @date 2026-05-23
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('mes-theme-v2') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mes-theme-v2', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
