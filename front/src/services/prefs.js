// 사용자별 UI 환경설정(북마크·위젯 배치·분할 사이즈) 서버 저장/복원 서비스 - 2026-07-28
// 전략: localStorage를 즉시 렌더용 캐시로 쓰고, 서버(MongoDB)를 원본으로 동기화.
//        서버 저장은 (uid, key)별 디바운스로 과도한 요청을 막음.
import { API_BASE } from '../constants/api'

const API = `${API_BASE}/api/prefs`
const norm = (uid) => (uid ?? 'guest').toString().trim().toLowerCase()

// 서버에서 사용자 전체 환경설정 로드 → { key: value, ... } (실패 시 null) - 2026-07-28
export async function fetchPrefs(uid) {
  try {
    const r = await fetch(`${API}/${encodeURIComponent(norm(uid))}`)
    if (!r.ok) return null
    const json = await r.json()
    return json?.data ?? {}
  } catch {
    return null
  }
}

// (uid, key)별 디바운스 타이머 보관 - 2026-07-28
const timers = new Map()

// 특정 슬라이스를 서버에 부분 병합 저장(디바운스). 실패해도 조용히 무시(로컬 캐시 유지). - 2026-07-28
export function savePrefsSlice(uid, key, value, delay = 600) {
  const tkey = `${norm(uid)}::${key}`
  const prev = timers.get(tkey)
  if (prev) clearTimeout(prev)
  const t = setTimeout(() => {
    timers.delete(tkey)
    fetch(`${API}/${encodeURIComponent(norm(uid))}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => { /* 오프라인 등 — 로컬 캐시로 대체 */ })
  }, delay)
  timers.set(tkey, t)
}
