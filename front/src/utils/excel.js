// 엑셀 유틸리티 (SheetJS) - 2026-05-24
import * as XLSX from 'xlsx'

const SKIP_KEYS = ['row-actions', 'actions']

/**
 * 렌더 함수가 순수 문자열/숫자를 반환하면 그 값을, 아니면 raw 필드값을 반환
 */
function getCellValue(col, row) {
  if (col.render) {
    const result = col.render(row)
    if (typeof result === 'string' || typeof result === 'number') return result
  }
  const val = row[col.key]
  if (val === null || val === undefined) return ''
  if (typeof val === 'boolean') return val ? 'Y' : 'N'
  return val
}

/**
 * 테이블 데이터 → 엑셀 다운로드
 * @param {Array}  columns  - 테이블 컬럼 정의 배열
 * @param {Array}  data     - 테이블 데이터 배열
 * @param {string} filename - 저장 파일명 (확장자 제외)
 */
export function exportToExcel(columns, data, filename = 'export') {
  const exportCols = columns.filter(c => !SKIP_KEYS.includes(c.key) && c.label)

  const headers = exportCols.map(c => c.label)
  const rows    = data.map(row => exportCols.map(col => getCellValue(col, row)))

  // 헤더 행 스타일 (굵게)
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // 컬럼 너비 자동 조정
  ws['!cols'] = headers.map((h, i) => ({
    wch: Math.min(
      Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2,
      40
    ),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 엑셀 파일 파싱 → 컬럼 레이블 매핑 후 데이터 반환
 * @param {File}  file    - 업로드 파일 객체
 * @param {Array} columns - 테이블 컬럼 정의 배열
 * @returns {Promise<{ rows: object[], matched: string[], skipped: string[] }>}
 */
export function parseExcelFile(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const aoa  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (!aoa.length || !aoa[0].length) {
          resolve({ rows: [], matched: [], skipped: [] })
          return
        }

        const excelHeaders = aoa[0].map(h => String(h).trim())

        // 레이블 → 키 매핑 테이블 구성
        const labelToKey = {}
        columns.forEach(col => {
          if (col.label && col.key && !SKIP_KEYS.includes(col.key)) {
            labelToKey[col.label] = col.key
          }
        })

        // 매칭된 컬럼 인덱스
        const matchedCols = excelHeaders
          .map((h, i) => ({ index: i, key: labelToKey[h], label: h }))
          .filter(m => m.key)

        const skipped = excelHeaders.filter(h => !labelToKey[h] && h !== '')

        // 빈 행 제외 후 파싱
        const rows = aoa
          .slice(1)
          .filter(row => row.some(v => v !== '' && v !== null && v !== undefined))
          .map(row => {
            const obj = {}
            matchedCols.forEach(m => { obj[m.key] = row[m.index] ?? '' })
            return obj
          })

        resolve({ rows, matched: matchedCols.map(m => m.label), skipped })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}
