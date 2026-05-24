// 생산실적 공통 상수 - 2026-05-23

export const PROD_STATUS = [
  { value: 'ALL',       label: '전체' },
  { value: 'ONGOING',   label: '진행중' },
  { value: 'COMPLETED', label: '완료' },
]

export const PROD_STATUS_FORM = PROD_STATUS.filter(o => o.value !== 'ALL')

export const PROD_STATUS_BADGE = {
  ONGOING:   { labelKey: 'opt.prod.ONGOING',   color: 'var(--accent)',   bg: 'var(--accent-subtle)' },
  COMPLETED: { labelKey: 'opt.prod.COMPLETED', color: 'var(--success)',  bg: 'rgba(74,222,128,0.1)' },
}
