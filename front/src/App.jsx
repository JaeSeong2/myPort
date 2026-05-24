// 앱 루트 - React Router 전체 라우팅 구성 - 2026-05-23
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider }     from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import PanelArea from './components/layout/PanelArea'

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/main" element={<MainPage />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<PanelArea />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  )
}
