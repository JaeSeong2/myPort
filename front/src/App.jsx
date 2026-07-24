// 앱 루트 - React Router 전체 라우팅 구성 - 2026-05-23
// HashRouter 사용: 정적 호스팅(Railway 등)에서 새로고침 404 방지 (서버 rewrite 불필요) - 2026-07-24
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider }     from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import PanelArea from './components/layout/PanelArea'

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/main" element={<MainPage />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<PanelArea />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
    </LanguageProvider>
  )
}
