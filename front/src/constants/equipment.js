// 설비 관련 상수 - 2026-05-24
export const EQ_TYPE = [
  { value: 'ALL',        label: '전체' },
  { value: 'PRODUCTION', label: '생산' },
  { value: 'UTILITY',    label: '유틸리티' },
  { value: 'SAFETY',     label: '안전' },
  { value: 'INSPECTION', label: '검사' },
]

export const EQ_TYPE_FORM = [
  { value: 'PRODUCTION', label: '생산' },
  { value: 'UTILITY',    label: '유틸리티' },
  { value: 'SAFETY',     label: '안전' },
  { value: 'INSPECTION', label: '검사' },
]

export const EQ_STATUS = [
  { value: 'ALL',         label: '전체' },
  { value: 'RUNNING',     label: '가동' },
  { value: 'IDLE',        label: '대기' },
  { value: 'MAINTENANCE', label: '정비중' },
  { value: 'BREAKDOWN',   label: '고장' },
]

export const EQ_STATUS_FORM = [
  { value: 'RUNNING',     label: '가동' },
  { value: 'IDLE',        label: '대기' },
  { value: 'MAINTENANCE', label: '정비중' },
  { value: 'BREAKDOWN',   label: '고장' },
]

export const EQ_TYPE_BADGE = {
  PRODUCTION: { labelKey: 'opt.eq.type.PRODUCTION', color: 'var(--accent)',   bg: 'var(--accent-subtle)' },
  UTILITY:    { labelKey: 'opt.eq.type.UTILITY',    color: '#a855f7',         bg: 'rgba(168,85,247,0.1)' },
  SAFETY:     { labelKey: 'opt.eq.type.SAFETY',     color: 'var(--success)',  bg: 'rgba(74,222,128,0.1)' },
  INSPECTION: { labelKey: 'opt.eq.type.INSPECTION', color: 'var(--warning)',  bg: 'rgba(251,191,36,0.1)' },
}

export const EQ_STATUS_BADGE = {
  RUNNING:     { labelKey: 'opt.eq.status.RUNNING',     color: 'var(--success)',        bg: 'rgba(74,222,128,0.1)' },
  IDLE:        { labelKey: 'opt.eq.status.IDLE',        color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  MAINTENANCE: { labelKey: 'opt.eq.status.MAINTENANCE', color: 'var(--warning)',        bg: 'rgba(251,191,36,0.1)' },
  BREAKDOWN:   { labelKey: 'opt.eq.status.BREAKDOWN',   color: 'var(--danger)',         bg: 'var(--danger-subtle)' },
}

export const EQ_CODE_PREFIX = {
  PRODUCTION: 'EQ-P',
  UTILITY:    'EQ-U',
  SAFETY:     'EQ-S',
  INSPECTION: 'EQ-I',
}
