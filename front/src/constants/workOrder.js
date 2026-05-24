// 작업지시 공통 상수 - 2026-05-23

/** 작업지시 상태 */
export const WO_STATUS = [
  { value: 'ALL',      label: '전체' },
  { value: 'PENDING',  label: '대기' },
  { value: 'IN_PROG',  label: '진행' },
  { value: 'STOPPED',  label: '중지' },
  { value: 'DONE',     label: '완료' },
]

/** 작업지시 유형 */
export const WO_TYPE = [
  { value: 'ALL',      label: '전체' },
  { value: 'NORMAL',   label: '일반' },
  { value: 'URGENT',   label: '긴급' },
  { value: 'REWORK',   label: '재작업' },
]

/** 작업지시 우선순위 */
export const WO_PRIORITY = [
  { value: 'ALL',    label: '전체' },
  { value: 'HIGH',   label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW',    label: '낮음' },
]

// 입력 폼용 (ALL 제외)
export const WO_STATUS_FORM   = WO_STATUS.filter(o => o.value !== 'ALL')
export const WO_TYPE_FORM     = WO_TYPE.filter(o => o.value !== 'ALL')
export const WO_PRIORITY_FORM = WO_PRIORITY.filter(o => o.value !== 'ALL')
