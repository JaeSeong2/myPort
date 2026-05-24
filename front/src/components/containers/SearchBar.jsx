// 조건검색 공통 컴포넌트 - 2026-05-23
import { useState, useEffect } from 'react'

/**
 * @param {Array}    fields   - searchFields 배열
 *   field.type: 'text' | 'select' | 'daterange'
 *   field.options:     정적 옵션 배열 [{ value, label }]
 *   field.optionsFrom: API URL (동적 로딩) - { value: code, label: "code name" } 형태 반환
 * @param {Object}   filters  - 현재 필터 상태
 * @param {Function} onChange - (key, value) => void
 */
export default function SearchBar({ fields, filters, onChange }) {
  return (
    <div className="bg-surface border border-theme rounded-lg p-4 flex flex-wrap items-end gap-3">
      {fields.map(field => (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-xs text-muted">{field.label}</label>
          <FieldInput field={field} value={filters[field.key]} onChange={onChange} />
        </div>
      ))}
    </div>
  )
}

// 옵션 캐시 (페이지 이동 시 재요청 방지)
const optionsCache = {}

function FieldInput({ field, value, onChange }) {
  const [asyncOpts, setAsyncOpts] = useState(null)

  // optionsFrom 이 있으면 API에서 옵션 로드
  useEffect(() => {
    if (!field.optionsFrom) return
    if (optionsCache[field.optionsFrom]) {
      setAsyncOpts(optionsCache[field.optionsFrom])
      return
    }
    const url = new URL(field.optionsFrom)
    url.searchParams.set('active_only', 'true')
    fetch(url.toString())
      .then(r => r.json())
      .then(json => {
        const opts = [
          { value: 'ALL', label: '전체' },
          ...json.data.map(d => ({ value: d.code, label: `${d.code} ${d.name}` })),
        ]
        optionsCache[field.optionsFrom] = opts
        setAsyncOpts(opts)
      })
      .catch(() => setAsyncOpts([]))
  }, [field.optionsFrom])

  if (field.type === 'select') {
    const options = field.optionsFrom ? (asyncOpts ?? []) : (field.options ?? [])
    return (
      <select
        value={value}
        onChange={e => onChange(field.key, e.target.value)}
        className="text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary min-w-24 cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  if (field.type === 'daterange') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
        <input
          type="date" value={value[0]}
          onChange={e => onChange(field.key, [e.target.value, value[1]])}
          className="text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary cursor-pointer"
        />
        <span className="text-muted text-xs text-center">~</span>
        <input
          type="date" value={value[1]}
          onChange={e => onChange(field.key, [value[0], e.target.value])}
          className="text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary cursor-pointer"
        />
      </div>
    )
  }

  return (
    <input
      type="text" value={value} placeholder={field.label}
      onChange={e => onChange(field.key, e.target.value)}
      className="text-sm bg-base border border-theme rounded-md px-2 py-1.5 text-primary min-w-32"
    />
  )
}
