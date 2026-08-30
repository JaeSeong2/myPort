// 에러 경계 — 렌더 중 예외를 잡아 백색 화면 대신 안내 UI 표시 - 2026-08-24
// 패널 콘텐츠 단위로 감싸 한 페이지의 오류가 앱 전체를 죽이지 않도록 한다.
import { Component } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

// 안내 UI(함수형) — 클래스 경계에서 로케일 사용을 위해 분리 - 2026-08-24
function Fallback({ error, onReset }) {
  const { t } = useLanguage()
  return (
    <div className="h-full min-h-40 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle size={28} className="text-amber-400" />
      <p className="text-sm font-medium text-primary">{t('err.title')}</p>
      {error?.message && (
        <p className="text-xs text-muted max-w-md break-words">{error.message}</p>
      )}
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer"
      >
        <RotateCw size={12} /> {t('err.reload')}
      </button>
    </div>
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 진단용 — 콘솔에 실제 스택 노출(백색 화면 대신 원인 파악 가능) - 2026-08-24
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return <Fallback error={this.state.error} onReset={this.reset} />
    }
    return this.props.children
  }
}
