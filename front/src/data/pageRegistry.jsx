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
import SysSettings     from '../pages/modules/settings/SysSettingsPage'
import UserMgmt        from '../pages/modules/settings/UserMgmtPage'
import ItemMgmt        from '../pages/modules/master-data/ItemMgmtPage'
import BomMgmt         from '../pages/modules/master-data/BomMgmtPage'

/** 경로 → 컴포넌트 매핑 (우측 패널 렌더링용) */
export const pageRegistry = {
  '/main/dashboard':           DashboardPage,
  '/main/work-order/status':   WOStatus,
  '/main/work-order/create':   WOCreate,
  '/main/work-order/assign':   WOAssign,
  '/main/work-order/history':  WOHistory,
  '/main/production/status':   ProdStatus,
  '/main/production/register': ProdRegister,
  '/main/production/report':   ProdReport,
  '/main/equipment/status':    EqStatus,
  '/main/equipment/history':   EqHistory,
  '/main/equipment/pm':        EqPm,
  '/main/quality/inspect':     QaInspect,
  '/main/quality/defect':      QaDefect,
  '/main/quality/spc':         QaSpc,
  '/main/inventory/status':    InvStatus,
  '/main/inventory/inout':     InvInout,
  '/main/process/flow':        ProcFlow,
  '/main/process/bom':         BomMgmt,
  '/main/settings':            SysSettings,
  '/main/settings/items':      ItemMgmt,
  '/main/settings/users':      UserMgmt,
}
