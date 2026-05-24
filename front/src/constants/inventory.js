// 재고/자재 공통 상수 - 2026-05-23

export const INV_TXN_TYPE = [
  { value: 'ALL',    label: '전체' },
  { value: 'IN',     label: '입고' },
  { value: 'OUT',    label: '출고' },
  { value: 'ADJUST', label: '조정' },
]

export const INV_TXN_TYPE_FORM = INV_TXN_TYPE.filter(o => o.value !== 'ALL')

export const INV_TXN_BADGE = {
  IN:     { labelKey: 'opt.txn.IN',     color: 'var(--success)', bg: 'rgba(74,222,128,0.1)' },
  OUT:    { labelKey: 'opt.txn.OUT',    color: 'var(--danger)',  bg: 'var(--danger-subtle)' },
  ADJUST: { labelKey: 'opt.txn.ADJUST', color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)' },
}

export const STOCK_STATUS_BADGE = {
  LOW:  { labelKey: 'opt.stock.LOW',  color: 'var(--danger)',  bg: 'var(--danger-subtle)' },
  OK:   { labelKey: 'opt.stock.OK',   color: 'var(--success)', bg: 'rgba(74,222,128,0.1)' },
  HIGH: { labelKey: 'opt.stock.HIGH', color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)' },
}
