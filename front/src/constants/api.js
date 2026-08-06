// API 기본 URL - 2026-05-23
// .env: VITE_API_BASE=http://localhost:8000 (개발)
// .env.production: VITE_API_BASE=https://your-backend.com (배포)
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''

// WebSocket URL 빌더 — API_BASE가 절대주소면 ws(s)로 변환, 아니면 현재 호스트(프록시) 사용 - 2026-08-02
export function wsUrl(path) {
  if (/^https?:\/\//i.test(API_BASE)) return API_BASE.replace(/^http/i, 'ws') + path
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}${path}`
}
