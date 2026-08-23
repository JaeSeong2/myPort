// MES 사이드바 메뉴 트리 설정 - 2026-05-23
// URL 구조 은닉(미관) — 경로를 불투명 코드로 사용(모듈 구조 비노출). 라벨(labelKey)은 그대로 - 2026-08-18
//   · path는 pageRegistry 키와 1:1로 일치해야 함(둘을 함께 수정)
//   · dashboard는 기본 진입/이동 대상이라 유지
import {
  LayoutDashboard, ClipboardList, BarChart2,
  Wrench, ShieldCheck, Package, GitBranch, Settings, Users, Database, ScanEye,
} from 'lucide-react'

export const menuConfig = [
  {
    id: 'dashboard', labelKey: 'menu.dashboard', label: '대시보드',
    icon: LayoutDashboard, path: '/main/dashboard',
  },
  {
    id: 'master-data', labelKey: 'menu.masterData', label: '기초정보',
    icon: Database,
    children: [
      { id: 'item-mgmt', labelKey: 'menu.item',      label: '품목 관리', path: '/main/im8x' },
      { id: 'proc-bom',  labelKey: 'menu.proc.bom',  label: 'BOM 관리',  path: '/main/bm4k' },
    ],
  },
  {
    id: 'work-order', labelKey: 'menu.workOrder', label: '작업지시 관리',
    icon: ClipboardList,
    children: [
      { id: 'wo-status',  labelKey: 'menu.wo.status',  label: '작업지시 현황', path: '/main/wo7q' },
      { id: 'wo-assign',  labelKey: 'menu.wo.assign',  label: '작업 배정',     path: '/main/wa2n',  wip: true },
      { id: 'wo-history', labelKey: 'menu.wo.history', label: '작업 이력',     path: '/main/wh5c', wip: true },
    ],
  },
  {
    id: 'production', labelKey: 'menu.production', label: '생산 실적',
    icon: BarChart2,
    children: [
      { id: 'prod-status',   labelKey: 'menu.prod.status',   label: '실적 현황',       path: '/main/ps3v' },
      { id: 'prod-register', labelKey: 'menu.prod.register', label: '실적 등록',       path: '/main/pr9d', wip: true },
      { id: 'prod-report',   labelKey: 'menu.prod.report',   label: '일/월 실적 조회', path: '/main/rp3q' },
      { id: 'lot-tracking',  labelKey: 'menu.lot.tracking',  label: 'LOT 추적',        path: '/main/lt6b' },
    ],
  },
  {
    id: 'equipment', labelKey: 'menu.equipment', label: '설비 관리',
    icon: Wrench,
    children: [
      { id: 'eq-status',  labelKey: 'menu.eq.status',  label: '설비 현황', path: '/main/eq2v' },
      { id: 'eq-history', labelKey: 'menu.eq.history', label: '설비 이력', path: '/main/eh8m', wip: true },
      { id: 'eq-pm',      labelKey: 'menu.eq.pm',      label: '예방 정비', path: '/main/ep4t',      wip: true },
    ],
  },
  {
    id: 'quality', labelKey: 'menu.quality', label: '품질 관리',
    icon: ShieldCheck,
    children: [
      { id: 'qa-inspect', labelKey: 'menu.qa.inspect', label: '검사 현황', path: '/main/qi5n' },
      { id: 'qa-defect',  labelKey: 'menu.qa.defect',  label: '불량 현황', path: '/main/qd7w', wip: true },
      { id: 'qa-spc',     labelKey: 'menu.qa.spc',     label: 'SPC 차트',  path: '/main/qs1h',    wip: true },
    ],
  },
  {
    id: 'inventory', labelKey: 'menu.inventory', label: '재고/자재',
    icon: Package,
    children: [
      { id: 'inv-status', labelKey: 'menu.inv.status', label: '자재 현황',   path: '/main/iv3p' },
      { id: 'inv-inout',  labelKey: 'menu.inv.inout',  label: '입출고 현황', path: '/main/io9r', wip: true },
    ],
  },
  {
    id: 'process', labelKey: 'menu.process', label: '공정 관리',
    icon: GitBranch,
    children: [
      { id: 'proc-flow', labelKey: 'menu.proc.flow', label: '공정 흐름', path: '/main/pf6k' },
    ],
  },
  {
    // AI 비전 관제 — 폰 카메라 실시간 영상 + 객체 감지 - 2026-08-02
    id: 'vision-monitor', labelKey: 'vm.title', label: 'AI 비전 관제',
    icon: ScanEye, path: '/main/mv7k',
  },
  {
    id: 'settings', labelKey: 'menu.settings', label: '시스템 설정',
    icon: Settings,
    children: [
      { id: 'settings-main', labelKey: 'menu.settings',  label: '시스템 설정',     path: '/main/sy2x',       wip: true },
      { id: 'user-mgmt',     labelKey: 'menu.userMgmt',  label: '사용자 권한관리', path: '/main/us5g' },
    ],
  },
]
