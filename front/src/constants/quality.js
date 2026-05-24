// 품질검사 공통 상수 - 2026-05-23

export const INSPECT_TYPE = [
  { value: 'ALL',        label: '전체' },
  { value: 'INCOMING',   label: '수입검사' },
  { value: 'IN_PROCESS', label: '공정검사' },
  { value: 'FINAL',      label: '최종검사' },
]

export const INSPECT_TYPE_FORM = INSPECT_TYPE.filter(o => o.value !== 'ALL')

export const INSPECT_RESULT = [
  { value: 'ALL',         label: '전체' },
  { value: 'PASS',        label: '합격' },
  { value: 'CONDITIONAL', label: '조건부합격' },
  { value: 'FAIL',        label: '불합격' },
]

export const INSPECT_RESULT_FORM = INSPECT_RESULT.filter(o => o.value !== 'ALL')

export const INSPECT_TYPE_BADGE = {
  INCOMING:   { labelKey: 'opt.inspect.INCOMING',   color: 'var(--accent)',  bg: 'var(--accent-subtle)' },
  IN_PROCESS: { labelKey: 'opt.inspect.IN_PROCESS', color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)' },
  FINAL:      { labelKey: 'opt.inspect.FINAL',      color: 'var(--success)', bg: 'rgba(74,222,128,0.1)' },
}

export const INSPECT_RESULT_BADGE = {
  PASS:        { labelKey: 'opt.result.PASS',        color: 'var(--success)', bg: 'rgba(74,222,128,0.1)' },
  CONDITIONAL: { labelKey: 'opt.result.CONDITIONAL', color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)' },
  FAIL:        { labelKey: 'opt.result.FAIL',        color: 'var(--danger)',  bg: 'rgba(248,113,113,0.1)' },
}
