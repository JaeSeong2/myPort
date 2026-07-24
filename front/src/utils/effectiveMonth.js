// 최신월 폴백 유틸 — 현재월에 데이터가 있으면 현재월, 없으면 데이터가 있는 최근 월 반환 - 2026-07-24
// 월이 바뀌어 현재월이 비어도 대시보드/문서출력이 마지막 데이터월을 표시하도록 함.
const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * @param {Array}  records   조회 대상 레코드 배열
 * @param {string} dateField 날짜 필드명 (예: 'work_date', 'inspect_date', 'planned_start')
 * @returns {{ start:string, end:string, year:number, month:number }} month 는 0-based
 */
export function effectiveMonthRange(records, dateField) {
  const now = new Date()
  const curKey = fmt(now).slice(0, 7)
  const dates = (records || []).map((r) => (r[dateField] || '').slice(0, 10)).filter(Boolean)

  let y = now.getFullYear()
  let m = now.getMonth() // 0-based

  const hasCurrent = dates.some((d) => d.slice(0, 7) === curKey)
  if (!hasCurrent && dates.length) {
    const maxd = dates.reduce((a, b) => (b > a ? b : a), '')
    const [yy, mm] = maxd.slice(0, 7).split('-').map(Number)
    y = yy
    m = mm - 1
  }

  return {
    start: fmt(new Date(y, m, 1)),
    end: fmt(new Date(y, m + 1, 0)),
    year: y,
    month: m,
  }
}
