// 새 버전 배포 감지 → 우하단 토스트로 새로고침 안내 - 2026-08-07
// 서버의 version.json(캐시 무시)과 빌드에 박힌 APP_VERSION을 비교, 다르면 표시.
import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { APP_VERSION } from '../../data/changelog'
import { useLanguage } from '../../context/LanguageContext'

const POLL_MS = 5 * 60 * 1000 // 5분마다 확인

export default function UpdateToast() {
  const { t } = useLanguage()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let alive = true
    // 서버 최신 버전 확인 — 캐시를 피하려 no-store + 타임스탬프 - 2026-08-07
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json()
        if (alive && j.version && j.version !== APP_VERSION) setShow(true)
      } catch { /* 네트워크 실패는 조용히 무시 */ }
    }
    check()
    const id = setInterval(check, POLL_MS)
    const onFocus = () => check()  // 탭 복귀 시 즉시 확인
    window.addEventListener('focus', onFocus)
    return () => { alive = false; clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-200 w-80 max-w-[90vw] bg-surface border border-theme rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
          <RefreshCw size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">{t('upd.title')}</p>
          <p className="text-xs text-muted mt-0.5">{t('upd.desc')}</p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer">
              <RefreshCw size={12} /> {t('upd.refresh')}
            </button>
            <button onClick={() => setShow(false)}
              className="px-3 py-1.5 rounded-md text-xs border border-theme text-muted hover-text-primary cursor-pointer">
              {t('upd.later')}
            </button>
          </div>
        </div>
        <button onClick={() => setShow(false)} className="text-muted hover-text-primary cursor-pointer shrink-0" aria-label={t('ui.close')}>
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
