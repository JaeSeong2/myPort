// 반응형 브레이크포인트 훅 - 2026-05-24
import { useState, useEffect } from 'react'

/**
 * 화면 너비가 bp(px) 미만이면 true 반환
 * @param {number} bp - 기준 너비 (기본 768px = md)
 */
export function useIsMobile(bp = 768) {
  const [is, setIs] = useState(() => window.innerWidth < bp)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`)
    const fn  = (e) => setIs(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [bp])

  return is
}
