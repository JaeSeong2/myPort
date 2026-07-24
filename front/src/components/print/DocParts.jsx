// 문서 출력용 공통 빌딩블록 — 미리보기·인쇄 공용, 항상 라이트(흰 종이) 스타일 - 2026-07-24
const BORDER = '1px solid #b5b5b5'
const HEAD_BG = '#f2f2f2'

// A4 문서 용지 래퍼 (인쇄 시 .doc-sheet 규칙으로 폭·패딩 조정)
export function DocSheet({ children }) {
  return (
    <div
      className="doc-sheet"
      style={{
        background: '#fff', color: '#1a1a1a', width: '210mm', maxWidth: '100%',
        margin: '0 auto', padding: '14mm 13mm', boxSizing: 'border-box',
        fontSize: 12, lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  )
}

// 문서 상단 — 회사명 / 제목 / 우측 메타(문서번호·발행일)
export function DocHeader({ company, title, meta = [] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{company}</div>
      <h1 style={{
        fontSize: 22, fontWeight: 800, letterSpacing: 4, textAlign: 'center',
        margin: '4px 0 10px', borderBottom: '3px solid #333', paddingBottom: 10,
      }}>{title}</h1>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 11, color: '#444' }}>
        {meta.map((m, i) => (
          <span key={i}><b style={{ color: '#222' }}>{m.label}:</b> {m.value}</span>
        ))}
      </div>
    </div>
  )
}

// 요약 지표 카드 열
export function DocSummary({ items = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
      {items.map((it, i) => (
        <div key={i} style={{ flex: '1 1 110px', border: BORDER, borderRadius: 4, padding: '7px 10px' }}>
          <div style={{ fontSize: 10, color: '#777' }}>{it.label}</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}

// 라벨-값 세로 표 (단건 문서용)
export function DocFields({ rows = [] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0', fontSize: 12 }}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <th style={{ border: BORDER, background: HEAD_BG, textAlign: 'left', padding: '7px 10px', width: '24%', fontWeight: 600 }}>
              {r.label}
            </th>
            <td style={{ border: BORDER, padding: '7px 10px' }}>{r.value ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 목록 표 (다건 문서용)
export function DocTable({ columns, data = [] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, margin: '8px 0' }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={{ border: BORDER, background: HEAD_BG, padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ border: BORDER, padding: 16, textAlign: 'center', color: '#888' }}>
              데이터가 없습니다.
            </td>
          </tr>
        ) : data.map((row, i) => (
          <tr key={row._id ?? i}>
            {columns.map((c) => (
              <td key={c.key} style={{ border: BORDER, padding: '5px 8px' }}>
                {c.render ? c.render(row) : (row[c.key] ?? '-')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 서명란 (작성·검토·승인)
export function DocSignatures({ slots = ['작성', '검토', '승인'] }) {
  return (
    <table style={{ marginLeft: 'auto', marginTop: 22, borderCollapse: 'collapse', fontSize: 11 }}>
      <tbody>
        <tr>
          {slots.map((s, i) => (
            <th key={i} style={{ border: BORDER, background: HEAD_BG, padding: '4px 16px', fontWeight: 600 }}>{s}</th>
          ))}
        </tr>
        <tr>
          {slots.map((_, i) => (
            <td key={i} style={{ border: BORDER, height: 46, width: 78 }} />
          ))}
        </tr>
      </tbody>
    </table>
  )
}
