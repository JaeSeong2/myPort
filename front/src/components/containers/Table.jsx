// 데이터 테이블 공통 컴포넌트 - 2026-05-23
// 컬럼 헤더 클릭 정렬(오름차순 → 내림차순 → 해제) 추가 - 2026-07-24
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export default function Table({ columns, data = [], loading = false, emptyText, onRowDoubleClick }) {
  const { t } = useLanguage()
  const empty = emptyText ?? t('msg.noData') // 미지정 시 로케일 기본값 - 2026-08-13
  const [sort, setSort] = useState({ key: null, dir: null }) // dir: 'asc' | 'desc' | null

  // 정렬 가능 여부 — 명시값(col.sortable) 우선, 미지정 시 실제 데이터 값이 있는 컬럼만 자동 허용
  // (액션/버튼 컬럼은 row에 해당 key가 없어 자동 제외) - 2026-07-24
  const isSortable = (col) => {
    if (col.sortable === true)  return true
    if (col.sortable === false) return false
    return !!col.sortValue || (data.length > 0 && data[0][col.key] !== undefined)
  }

  // 헤더 클릭 시 오름차순 → 내림차순 → 해제 순환 - 2026-07-24
  const handleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key)   return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: null }
    })
  }

  // 정렬 적용 — 숫자(문자열 포함)는 수치 비교, 그 외 한글 우선 localeCompare, 빈값은 항상 뒤로 - 2026-07-24
  const rows = useMemo(() => {
    if (!sort.key || !sort.dir) return data
    const col = columns.find((c) => c.key === sort.key)
    const getVal = (row) => (col?.sortValue ? col.sortValue(row) : row[sort.key])
    const dirMul = sort.dir === 'desc' ? -1 : 1
    const isEmpty = (v) => v === null || v === undefined || v === ''
    return [...data].sort((a, b) => {
      const va = getVal(a), vb = getVal(b)
      if (isEmpty(va) && isEmpty(vb)) return 0
      if (isEmpty(va)) return 1   // 빈값은 방향과 무관하게 뒤로
      if (isEmpty(vb)) return -1
      const na = Number(va), nb = Number(vb)
      const bothNum = !Number.isNaN(na) && !Number.isNaN(nb)
      const cmp = bothNum ? na - nb : String(va).localeCompare(String(vb), 'ko')
      return cmp * dirMul
    })
  }, [data, sort, columns])

  // 헤더 정렬 아이콘 — 활성 컬럼은 방향 표시, 그 외는 흐린 양방향 아이콘 - 2026-07-24
  const SortIcon = ({ col }) => {
    if (sort.key !== col.key) return <ChevronsUpDown size={12} className="opacity-40 shrink-0" />
    return sort.dir === 'asc'
      ? <ChevronUp size={12} className="text-accent shrink-0" />
      : <ChevronDown size={12} className="text-accent shrink-0" />
  }

  return (
    <div className="bg-surface border border-theme rounded-lg flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="overflow-auto flex-1 min-h-0">
        {/* 좁은 화면(모바일/세로)에선 min-width로 가로 스크롤 → 열 찌그러짐 방지, md 이상은 전체폭 맞춤 - 2026-07-28 */}
        <table className="w-full min-w-170 md:min-w-0 text-sm table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-theme bg-elevated">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left text-xs font-medium text-muted whitespace-nowrap overflow-hidden"
                  style={col.width ? { width: col.width } : {}}
                >
                  {isSortable(col) ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 max-w-full hover-text-primary transition-colors cursor-pointer select-none"
                      title={t('ui.sort')}
                    >
                      <span className="truncate">{col.label}</span>
                      <SortIcon col={col} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-theme">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-3 bg-elevated rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted text-sm">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row._id ?? idx}
                  className="border-b border-theme hover-bg-hover transition-colors cursor-pointer"
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-2.5 text-primary overflow-hidden">
                      {col.render ? (
                        <div className="whitespace-nowrap">{col.render(row)}</div>
                      ) : (
                        <div className="truncate">{row[col.key] ?? '-'}</div>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
