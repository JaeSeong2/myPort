// 관리자 대시보드 — 자유 그리드(드래그 이동 + 가로×세로 리사이즈) - 2026-07-25
import { LayoutDashboard, Gauge, BarChart3, Boxes, Sparkles, Activity } from 'lucide-react'
import { useWidgetGrid } from '../../../hooks/useWidgetGrid'
import { useKpiData } from '../../../hooks/useKpiData'
import { useLanguage } from '../../../context/LanguageContext'
import WidgetBoard from '../../../components/dashboard/WidgetBoard'
import { buildKpiContent } from './kpiWidgetContent'
import { PortfolioContent } from './portfolioContent'
import { AndonContent } from './andonWidget'
import { UTILITY_WIDGETS, utilityContent } from './utilityWidgets'

// 통합 위젯 레지스트리 — x/y/w/h(그리드 단위) + min/max로 리사이즈 범위 지정 - 2026-07-25
const WIDGETS = [
  { id: 'portfolio', labelKey: 'widget.portfolio', icon: LayoutDashboard, x: 0, y: 0,  w: 6, h: 16, minW: 4, minH: 8, maxW: 12, maxH: 40 },
  { id: 'kpi',       labelKey: 'widget.kpi',       icon: Gauge,           x: 6, y: 0,  w: 6, h: 6,  minW: 4, minH: 5, maxW: 12, maxH: 10 },
  { id: 'prod',      labelKey: 'widget.prod',      icon: BarChart3,       x: 6, y: 6,  w: 6, h: 8,  minW: 3, minH: 5, maxW: 12, maxH: 16 },
  { id: 'inv',       labelKey: 'widget.inv',       icon: Boxes,           x: 6, y: 14, w: 6, h: 8,  minW: 3, minH: 5, maxW: 12, maxH: 16 },
  { id: 'ai',        labelKey: 'widget.ai',        icon: Sparkles,        x: 6, y: 22, w: 6, h: 8,  minW: 3, minH: 5, maxW: 12, maxH: 20 },
  { id: 'andon',     labelKey: 'widget.andon',     icon: Activity,        x: 0, y: 16, w: 6, h: 9,  minW: 3, minH: 6, maxW: 12, maxH: 20 },
  ...UTILITY_WIDGETS,
]

export default function DashboardGrid() {
  const { t } = useLanguage()
  const grid = useWidgetGrid(WIDGETS, 'mes_dash_rgl')
  const data = useKpiData()
  const content = {
    portfolio: <PortfolioContent />,
    andon: <AndonContent />,
    ...buildKpiContent(data, t),
    ...utilityContent,
  }
  return <WidgetBoard grid={grid} content={content} />
}
