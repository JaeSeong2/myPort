// 모달 공통 컴포넌트 - 반응형 (모바일 바텀시트) - 2026-05-24
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useIsMobile } from '../../hooks/useBreakpoint'

const SIZE_DESKTOP = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
}

/**
 * @param {boolean}   open     - 열림 여부
 * @param {Function}  onClose  - 닫기 콜백
 * @param {string}    title    - 헤더 제목
 * @param {ReactNode} children - 본문
 * @param {ReactNode} footer   - 하단 버튼 영역
 * @param {'sm'|'md'|'lg'} size
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex ${isMobile ? 'items-end' : 'items-center justify-center p-4'}`}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className={`
          relative bg-surface border border-theme shadow-2xl flex flex-col
          ${isMobile
            ? 'w-full max-h-[90vh] rounded-t-2xl rounded-b-none border-b-0'
            : `w-full ${SIZE_DESKTOP[size]} max-h-[85vh] rounded-xl`
          }
        `}
      >
        {/* 모바일 드래그 핸들 */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-theme opacity-50" />
          </div>
        )}

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme shrink-0">
          <h3 className="text-primary font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover-text-primary hover-bg-elevated transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* 푸터 */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-theme shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
