// 액션 버튼 그룹 공통 컴포넌트 - 2026-05-24
import { useState, useRef, useEffect } from 'react'
import { Search, Plus, ChevronDown, Upload, Download } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

/**
 * @param {Function} onSearch                  - 조회 버튼
 * @param {Function} onAdd                     - 등록 버튼
 * @param {Function} onExcelUpload(file: File) - 엑셀 업로드: 선택된 파일 객체를 인자로 전달
 * @param {Function} onExcelDownload           - 엑셀 다운로드
 */
export default function ActionBar({ onSearch, onAdd, onExcelUpload, onExcelDownload }) {
  const { t } = useLanguage()
  const [excelOpen, setExcelOpen] = useState(false)
  const excelRef   = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (excelRef.current && !excelRef.current.contains(e.target)) setExcelOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      onExcelUpload(file)
      e.target.value = '' // 동일 파일 재선택 허용
    }
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {onSearch && (
        <button
          onClick={onSearch}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm border border-theme bg-elevated text-primary hover-bg-hover transition-colors cursor-pointer"
        >
          <Search size={14} />
          {t('btn.search')}
        </button>
      )}
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus size={14} />
          {t('btn.add')}
        </button>
      )}
      {(onExcelUpload || onExcelDownload) && (
        <div className="relative" ref={excelRef}>
          {/* 숨김 파일 input - 업로드 버튼 클릭 시 트리거 */}
          {onExcelUpload && (
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
          )}

          <button
            onClick={() => setExcelOpen(v => !v)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm border border-theme bg-elevated text-primary hover-bg-hover transition-colors cursor-pointer"
          >
            {t('btn.excel')}
            <ChevronDown size={13} />
          </button>

          {excelOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface border border-theme rounded-md shadow-lg z-50 min-w-32 py-1">
              {onExcelUpload && (
                <button
                  onClick={() => { fileInputRef.current?.click(); setExcelOpen(false) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-primary hover-bg-elevated transition-colors cursor-pointer"
                >
                  <Upload size={13} />
                  {t('btn.upload')}
                </button>
              )}
              {onExcelDownload && (
                <button
                  onClick={() => { onExcelDownload(); setExcelOpen(false) }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-primary hover-bg-elevated transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  {t('btn.download')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
