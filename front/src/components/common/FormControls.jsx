// 폼 공통 컨트롤 - 2026-05-24
import { useState, useEffect } from 'react'
import { API_BASE } from '../../constants/api'

const ITEMS_API = `${API_BASE}/api/items`

/**
 * 라벨 + 컨트롤 래퍼
 * @param {string}    label
 * @param {ReactNode} children
 * @param {string}    className
 */
export function Field({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label !== '' && <label className="text-xs text-muted">{label}</label>}
      {children}
    </div>
  )
}

/**
 * 텍스트 / 숫자 / 날짜 입력
 * @param {string}   type      - 'text' | 'number' | 'date' | 'time'
 * @param {string}   value
 * @param {Function} onChange
 * @param {boolean}  readOnly
 * @param {string}   placeholder
 */
export function Input({ type = 'text', value, onChange, readOnly, placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full ${readOnly ? 'opacity-60' : ''}`}
    />
  )
}

/**
 * 드롭다운 선택
 * @param {string}   value
 * @param {Function} onChange
 * @param {{ value: string, label: string }[]} options
 */
export function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

/**
 * 여러 줄 텍스트 입력
 * @param {string}   value
 * @param {Function} onChange
 * @param {number}   rows
 */
export function Textarea({ value, onChange, rows = 2 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full text-sm bg-base border border-theme rounded-md px-3 py-2 text-primary resize-none"
    />
  )
}

/**
 * 페이지 상단 구분선 - h2 타이틀 대체 (accent 바 + 라벨 + 수평선)
 * @param {string} title
 */
export function PageTitle() {
  // 탭 라벨이 페이지명을 이미 표시하므로 화면 상단 제목은 숨김 - 2026-07-24
  return null
}

/**
 * 품목 선택 - 품목명 드롭다운 + 품목코드 자동 입력
 * @param {string}   productCode  - 현재 선택된 품목코드
 * @param {string}   productName  - 현재 품목명 (edit 모드 표시용)
 * @param {Function} onSelect     - (item: {code,name,unit,...}) => void
 * @param {boolean}  readOnly     - true 이면 select 비활성화
 * @param {Function} filter       - (item) => boolean, 품목 필터 (optional)
 * @param {string}   nameLabel    - 품목명 필드 레이블
 * @param {string}   codeLabel    - 품목코드 필드 레이블
 */
export function ItemSelect({
  productCode = '',
  productName = '',
  onSelect,
  readOnly  = false,
  filter,
  nameLabel = '품목명',
  codeLabel = '품목코드',
}) {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetch(`${ITEMS_API}?active_only=true`)
      .then(r => r.json())
      .then(j => {
        const all = j.data ?? []
        setItems(filter ? all.filter(filter) : all)
      })
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    const item = items.find(i => i.code === e.target.value) ?? null
    onSelect?.(item)
  }

  const inputCls  = 'text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full opacity-60'
  const selectCls = 'text-sm bg-base border border-theme rounded-md px-3 py-1.5 text-primary w-full cursor-pointer'

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">{nameLabel}</label>
        {readOnly ? (
          <input value={productName} readOnly className={inputCls} />
        ) : (
          <select value={productCode} onChange={handleChange} className={selectCls}>
            <option value="">품목 선택</option>
            {items.map(i => (
              <option key={i.code} value={i.code}>{i.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">{codeLabel}</label>
        <input value={productCode} readOnly className={inputCls} />
      </div>
    </>
  )
}
