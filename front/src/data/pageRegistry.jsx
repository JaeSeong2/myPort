import DashboardPage   from '../pages/modules/dashboard/DashboardPage'
import WOStatus        from '../pages/modules/work-order/WoStatusPage'
import WOCreate        from '../pages/modules/work-order/WoCreatePage'
import WOAssign        from '../pages/modules/work-order/WoAssignPage'
import WOHistory       from '../pages/modules/work-order/WoHistoryPage'
import ProdStatus      from '../pages/modules/production/ProdStatusPage'
import ProdRegister    from '../pages/modules/production/ProdRegisterPage'
import ProdReport      from '../pages/modules/production/ProdReportPage'
import EqStatus        from '../pages/modules/equipment/EqStatusPage'
import EqHistory       from '../pages/modules/equipment/EqHistoryPage'
import EqPm            from '../pages/modules/equipment/EqPmPage'
import QaInspect       from '../pages/modules/quality/QaInspectPage'
import QaDefect        from '../pages/modules/quality/QaDefectPage'
import QaSpc           from '../pages/modules/quality/QaSpcPage'
import InvStatus       from '../pages/modules/inventory/InvStatusPage'
import InvInout        from '../pages/modules/inventory/InvInoutPage'
import ProcFlow        from '../pages/modules/process/ProcFlowPage'
import LotTracking     from '../pages/modules/lot/LotTrackingPage'
import SysSettings     from '../pages/modules/settings/SysSettingsPage'
import UserMgmt        from '../pages/modules/settings/UserMgmtPage'
import ItemMgmt        from '../pages/modules/master-data/ItemMgmtPage'
import BomMgmt         from '../pages/modules/master-data/BomMgmtPage'
import VisionMonitor   from '../pages/modules/monitor/VisionMonitorPage'

/** 경로 → 컴포넌트 매핑 (우측 패널 렌더링용)
 *  URL 구조 은닉(미관) — 키는 불투명 코드, menuConfig의 path와 1:1 일치해야 함 - 2026-08-18
 *  (주석의 원래 모듈명은 유지보수용 참고. dashboard만 노출 경로 유지) */
export const pageRegistry = {
  '/main/dashboard': DashboardPage,
  '/main/wo7q':      WOStatus,     // work-order/status
  '/main/wc3k':      WOCreate,     // work-order/create
  '/main/wa2n':      WOAssign,     // work-order/assign
  '/main/wh5c':      WOHistory,    // work-order/history
  '/main/ps3v':      ProdStatus,   // production/status
  '/main/pr9d':      ProdRegister, // production/register
  '/main/rp3q':      ProdReport,   // production/report
  '/main/eq2v':      EqStatus,     // equipment/status
  '/main/eh8m':      EqHistory,    // equipment/history
  '/main/ep4t':      EqPm,         // equipment/pm
  '/main/qi5n':      QaInspect,    // quality/inspect
  '/main/qd7w':      QaDefect,     // quality/defect
  '/main/qs1h':      QaSpc,        // quality/spc
  '/main/iv3p':      InvStatus,    // inventory/status
  '/main/io9r':      InvInout,     // inventory/inout
  '/main/pf6k':      ProcFlow,     // process/flow
  '/main/lt6b':      LotTracking,  // lot/tracking
  '/main/mv7k':      VisionMonitor,// monitor/vision
  '/main/bm4k':      BomMgmt,      // process/bom
  '/main/sy2x':      SysSettings,  // settings
  '/main/im8x':      ItemMgmt,     // settings/items
  '/main/us5g':      UserMgmt,     // settings/users
}
