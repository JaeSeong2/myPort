// 실시간 컨텍스트 — 단일 SSE 연결로 알림/Andon 상태를 앱 전역에 공급 - 2026-08-02
// TopBar 알림센터와 대시보드 Andon 위젯이 이 하나의 스트림을 공유한다.
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { API_BASE } from '../constants/api'

const RealtimeContext = createContext(null)

// 실시간 알림/Andon 데이터 구독 훅 - 2026-08-02
export const useRealtime = () => useContext(RealtimeContext)

const EMPTY_ANDON = { summary: {}, lines: [], total: 0 }

export function RealtimeProvider({ children }) {
  const [alerts,    setAlerts]    = useState([])
  const [andon,     setAndon]     = useState(EMPTY_ANDON)
  const [connected, setConnected] = useState(false)
  const [readIds,   setReadIds]   = useState(() => new Set()) // 읽음 처리한 알림 id

  // SSE 연결 — EventSource는 끊기면 자동 재연결하므로 수동 재시도 불필요 - 2026-08-02
  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/alerts/stream`)
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setAlerts(data.alerts ?? [])
        setAndon(data.andon ?? EMPTY_ANDON)
        setConnected(true)
      } catch { /* 파싱 실패 무시 */ }
    }
    es.onerror = () => setConnected(false) // 재연결은 브라우저가 자동 처리
    return () => es.close()
  }, [])

  // 알림센터를 열면 현재 알림을 모두 읽음 처리 → 배지 카운트 초기화 - 2026-08-02
  const markAllRead = useCallback(() => {
    setReadIds(new Set(alerts.map((a) => a.id)))
  }, [alerts])

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length

  const value = { alerts, andon, connected, unreadCount, markAllRead }
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
