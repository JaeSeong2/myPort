// 작업자 대시보드 — 자유 그리드(관리자와 동일 위젯 시스템) - 2026-07-25
import { LayoutDashboard, ClipboardCheck } from 'lucide-react'
import { useWidgetGrid } from '../../../hooks/useWidgetGrid'
import WidgetBoard from '../../../components/dashboard/WidgetBoard'
import { PortfolioContent } from './portfolioContent'
import { UTILITY_WIDGETS, utilityContent } from './utilityWidgets'
import DashboardWorker from './DashboardWorker'

const WIDGETS = [
  { id: 'portfolio', labelKey: 'widget.portfolio', icon: LayoutDashboard, x: 0, y: 0, w: 6, h: 16, minW: 4, minH: 8, maxW: 12, maxH: 40 },
  { id: 'worker',    labelKey: 'widget.worker',    icon: ClipboardCheck,  x: 6, y: 0, w: 6, h: 16, minW: 4, minH: 8, maxW: 12, maxH: 40 },
  ...UTILITY_WIDGETS,
]

export default function DashboardWorkerGrid() {
  const grid = useWidgetGrid(WIDGETS, 'mes_dash_worker_rgl')
  const content = {
    portfolio: <PortfolioContent />,
    worker: <DashboardWorker />,
    ...utilityContent,
  }
  return <WidgetBoard grid={grid} content={content} />
}
