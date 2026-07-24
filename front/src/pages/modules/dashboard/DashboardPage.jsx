// 대시보드 - 2026-05-30
import { useAuth } from '../../../context/AuthContext'
import DashboardGrid from './DashboardGrid'
import DashboardWorkerGrid from './DashboardWorkerGrid'

export default function DashboardPage() {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'ADMIN'

  // 관리자/작업자 모두 2컬럼 위젯 그리드(컬럼 간 이동·유틸리티 위젯 공용) - 2026-07-24
  return isAdmin ? <DashboardGrid /> : <DashboardWorkerGrid />
}
