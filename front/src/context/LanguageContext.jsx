// 언어 컨텍스트 - 2026-05-23
import { createContext, useContext, useState } from 'react'
import ko from '../locales/ko'
import en from '../locales/en'

const LOCALES = { ko, en }
const Ctx = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ko')

  const t = (key) => LOCALES[lang][key] ?? key

  const setLanguage = (l) => {
    setLang(l)
    localStorage.setItem('lang', l)
  }

  return (
    <Ctx.Provider value={{ lang, t, setLanguage }}>
      {children}
    </Ctx.Provider>
  )
}

export const useLanguage = () => useContext(Ctx)
