// 관리자 대시보드 — 자유 그리드(드래그 이동 + 가로×세로 리사이즈) - 2026-07-25
import { LayoutDashboard, Gauge, BarChart3, Boxes, Sparkles } from 'lucide-react'
import { useWidgetGrid } from '../../../hooks/useWidgetGrid'
import { useKpiData } from '../../../hooks/useKpiData'
import WidgetBoard from '../../../components/dashboard/WidgetBoard'
import { buildKpiContent } from './kpiWidgetContent'
import { PortfolioContent } from './portfolioContent'
import { UTILITY_WIDGETS, utilityContent } from './utilityWidgets'

// 통합 위젯 레지스트리 — x/y/w/h(그리드 단위) + min/max로 리사이즈 범위 지정 - 2026-07-25
const WIDGETS = [
  { id: 'portfolio', label: '포트폴리오',       icon: LayoutDashboard, x: 0, y: 0,  w: 6, h: 16, minW: 4, minH: 8, maxW: 12, maxH: 40 },
  { id: 'kpi',       label: '월간 KPI 카드',    icon: Gauge,           x: 6, y: 0,  w: 6, h: 6,  minW: 4, minH: 5, maxW: 12, maxH: 10 },
  { id: 'prod',      label: '일별 생산 실적',   icon: BarChart3,       x: 6, y: 6,  w: 6, h: 8,  minW: 3, minH: 5, maxW: 12, maxH: 16 },
  { id: 'inv',       label: '자재 재고 현황',   icon: Boxes,           x: 6, y: 14, w: 6, h: 8,  minW: 3, minH: 5, maxW: 12, maxH: 16 },
  { id: 'ai',        label: 'AI 생산 인사이트', icon: Sparkles,        x: 6, y: 22, w: 6, h: 8,  minW: 3, minH: 5, maxW: 12, maxH: 20 },
  ...UTILITY_WIDGETS,
]

export default function DashboardGrid() {
  const grid = useWidgetGrid(WIDGETS, 'mes_dash_rgl')
  const data = useKpiData()
  const content = {
    portfolio: PortfolioContent,
    ...buildKpiContent(data),
    ...utilityContent,
  }
  return <WidgetBoard grid={grid} content={content} />
}
