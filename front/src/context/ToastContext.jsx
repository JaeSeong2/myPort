// 전역 토스트 — 앱 어디서든 useToast()로 성공/오류/안내 알림 + 재시도 액션 - 2026-08-24
// 오류 토스트는 { retry } 를 주면 재시도 버튼을 표시(예: 데이터 재조회, AI 재생성).
import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react'
import { CheckCircle2, AlertTriangle, Info, RotateCw, X } from 'lucide-react'
import { useLanguage } from './LanguageContext'

const ToastContext = createContext(null)

// 토스트 발행 훅 — toast.success/error/info(message, { retry, duration }) - 2026-08-24
export const useToast = () => useContext(ToastContext)

const TYPE_STYLE = {
  success: { color: '#34d399', Icon: CheckCircle2 },
  error:   { color: '#f87171', Icon: AlertTriangle },
  info:    { color: '#60a5fa', Icon: Info },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])

  const push = useCallback((type, message, opts = {}) => {
    const id = ++idRef.current
    // 재시도(액션) 있으면 오래, 오류는 좀 더 길게, 일반은 짧게 - 2026-08-24
    const duration = opts.duration ?? (opts.retry ? 9000 : type === 'error' ? 6000 : 3500)
    setToasts((ts) => [...ts, { id, type, message, retry: opts.retry }])
    if (duration > 0) setTimeout(() => remove(id), duration)
    return id
  }, [remove])

  const toast = useMemo(() => ({
    success: (m, o) => push('success', m, o),
    error:   (m, o) => push('error', m, o),
    info:    (m, o) => push('info', m, o),
    dismiss: remove,
  }), [push, remove])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  )
}

// 우하단 스택 뷰포트 - 2026-08-24
function ToastViewport({ toasts, onClose }) {
  const { t } = useLanguage()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 w-80 max-w-[90vw]" style={{ zIndex: 250 }}>
      {toasts.map((toast) => {
        const { color, Icon } = TYPE_STYLE[toast.type] ?? TYPE_STYLE.info
        return (
          <div
            key={toast.id}
            className="animate-toast-in bg-surface border border-theme rounded-xl shadow-2xl overflow-hidden"
            role="status"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="flex items-start gap-2.5 p-3">
              <Icon size={16} className="shrink-0 mt-0.5" style={{ color }} />
              <p className="flex-1 text-xs text-primary leading-relaxed break-words">{toast.message}</p>
              <div className="flex items-center gap-1 shrink-0">
                {toast.retry && (
                  <button
                    onClick={() => { onClose(toast.id); toast.retry() }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors hover-bg-elevated"
                    style={{ color }}
                  >
                    <RotateCw size={11} /> {t('toast.retry')}
                  </button>
                )}
                <button
                  onClick={() => onClose(toast.id)}
                  className="text-muted hover-text-primary cursor-pointer p-0.5"
                  aria-label={t('ui.close')}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
