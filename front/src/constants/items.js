// 품목 공통 상수 - 2026-05-23

/** 단위 옵션 */
export const UNIT_OPTIONS = ['EA', 'KG', 'G', 'M', 'MM', 'L', 'BOX', 'SET', 'PCS', 'M2']

/** 품목유형별 코드 접두사 */
export const ITEM_CODE_PREFIX = {
  FINISHED:   'P',
  SEMI:       'S',
  RAW:        'M',
  CONSUMABLE: 'C',
}

/** 품목 유형 (조회용 - 전체 포함) */
export const ITEM_TYPE = [
  { value: 'ALL',        label: '전체' },
  { value: 'FINISHED',   label: '완제품' },
  { value: 'SEMI',       label: '반제품' },
  { value: 'RAW',        label: '원자재' },
  { value: 'CONSUMABLE', label: '소모품' },
]

/** 품목 유형 (입력 폼용 - 전체 제외) */
export const ITEM_TYPE_FORM = ITEM_TYPE.filter(o => o.value !== 'ALL')

/** 품목 유형 뱃지 컬러맵 */
export const ITEM_TYPE_BADGE = {
  FINISHED:   { labelKey: 'opt.item.FINISHED',   color: 'var(--accent)',         bg: 'var(--accent-subtle)' },
  SEMI:       { labelKey: 'opt.item.SEMI',        color: 'var(--warning)',        bg: 'rgba(251,191,36,0.1)' },
  RAW:        { labelKey: 'opt.item.RAW',         color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  CONSUMABLE: { labelKey: 'opt.item.CONSUMABLE',  color: 'var(--text-muted)',     bg: 'var(--bg-elevated)' },
}
