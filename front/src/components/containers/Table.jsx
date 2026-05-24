// 데이터 테이블 공통 컴포넌트 - 2026-05-23
export default function Table({ columns, data = [], loading = false, emptyText = '데이터가 없습니다.', onRowDoubleClick }) {
  return (
    <div className="bg-surface border border-theme rounded-lg flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-theme bg-elevated">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left text-xs font-medium text-muted whitespace-nowrap overflow-hidden"
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
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
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted text-sm">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
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
