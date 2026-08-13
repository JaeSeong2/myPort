// 유틸리티 위젯 공용 정의 — 관리자/작업자 대시보드가 함께 사용 - 2026-07-24
import { Calculator, StickyNote, ListChecks, Clock, Timer } from 'lucide-react'
import CalculatorWidget from '../../../components/dashboard/widgets/CalculatorWidget'
import MemoWidget from '../../../components/dashboard/widgets/MemoWidget'
import TodoWidget from '../../../components/dashboard/widgets/TodoWidget'
import ClockWidget from '../../../components/dashboard/widgets/ClockWidget'
import TimerWidget from '../../../components/dashboard/widgets/TimerWidget'

// 기본 숨김(hidden) — '위젯 편집 > 위젯 추가'에서 배치 / w·h·min·max: 그리드 단위 - 2026-07-25
export const UTILITY_WIDGETS = [
  { id: 'calc',  labelKey: 'widget.calc',  hidden: true, icon: Calculator, w: 3, h: 9, minW: 2, minH: 8, maxW: 6, maxH: 11 },
  { id: 'memo',  labelKey: 'widget.memo',  hidden: true, icon: StickyNote, w: 3, h: 6, minW: 2, minH: 3, maxW: 8, maxH: 16 },
  { id: 'todo',  labelKey: 'widget.todo',  hidden: true, icon: ListChecks, w: 3, h: 7, minW: 2, minH: 3, maxW: 8, maxH: 16 },
  { id: 'clock', labelKey: 'widget.clock', hidden: true, icon: Clock,      w: 3, h: 4, minW: 2, minH: 3, maxW: 5, maxH: 6 },
  { id: 'timer', labelKey: 'widget.timer', hidden: true, icon: Timer,      w: 3, h: 5, minW: 2, minH: 3, maxW: 5, maxH: 8 },
]

export const utilityContent = {
  calc:  <CalculatorWidget />,
  memo:  <MemoWidget />,
  todo:  <TodoWidget />,
  clock: <ClockWidget />,
  timer: <TimerWidget />,
}
