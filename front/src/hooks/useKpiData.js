// KPI 대시보드 데이터 로딩 훅 — 월간 KPI/일별 생산/자재 재고/AI 인사이트 - 2026-07-24
// 위젯이 어느 컬럼에 배치되든 데이터가 유지되도록 대시보드 컨테이너에서 사용.
import { useState, useEffect, useCallback, useRef } from 'react'
import { API_BASE } from '../constants/api'
import { effectiveMonthRange } from '../utils/effectiveMonth'
import { useLanguage } from '../context/LanguageContext'

const AI_API   = `${API_BASE}/api/ai/insight`
const WO_API   = `${API_BASE}/api/work-orders`
const PROD_API = `${API_BASE}/api/productions`
const INV_API  = `${API_BASE}/api/inventory`
const QA_API   = `${API_BASE}/api/quality`
const EQ_API   = `${API_BASE}/api/equipment`

// 오늘 날짜 + 언어 기준 캐시 키 — 날짜/언어가 바뀌면 자동 분리 - 2026-08-13
const insightKey = (lang) => `ai_insight_${new Date().toISOString().slice(0, 10)}_${lang}`
const readCache = (lang) => {
  try { return JSON.parse(localStorage.getItem(insightKey(lang))) ?? null }
  catch { return null }
}

const fmtDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useKpiData() {
  const { lang } = useLanguage() // AI 인사이트 생성/캐시 언어 - 2026-08-13
  const [kpi,       setKpi]       = useState({ wo: 0, ongoing: 0, lowStock: 0, passRate: '—', eqRunning: 0, eqBreakdown: 0 })
  const [prodChart, setProdChart] = useState([])
  const [invChart,  setInvChart]  = useState([])
  const [loading,   setLoading]   = useState(true)

  // localStorage 캐시로 초기화 — 다른 화면 이동 후 복귀 시 유지(현재 언어 기준)
  const [_init]          = useState(() => readCache(lang))
  const [aiInsight,      setAiInsight]      = useState(_init?.insight        ?? '')
  const [aiLoading,      setAiLoading]      = useState(false)
  const [aiError,        setAiError]        = useState('')
  const [tokenUsage,     setTokenUsage]     = useState(_init?.tokenUsage     ?? null)
  const [remainingCalls, setRemainingCalls] = useState(_init?.remainingCalls ?? null)
  const [generatedAt,    setGeneratedAt]    = useState(_init?.generatedAt    ?? '')

  // 언어별 자동 생성 1회 추적 — 초기 캐시가 있으면 해당 언어는 완료로 간주
  const firedLangs = useRef(new Set(_init ? [lang] : []))

  const loadKpi = useCallback(async () => {
    setLoading(true)
    try {
      // 최신월 폴백 — 현재월에 생산실적이 없으면 데이터가 있는 최근 월로 - 2026-07-24
      const probe = await fetch(`${PROD_API}`).then(r => r.json()).catch(() => ({ data: [] }))
      const { start: monthStart, end: monthEnd, year: effY, month: effM } =
        effectiveMonthRange(probe.data ?? [], 'work_date')

      const [woRes, prodAllRes, invRes, qaRes, eqRes] = await Promise.all([
        fetch(`${WO_API}?start_date=${monthStart}&end_date=${monthEnd}`).then(r => r.json()),
        fetch(`${PROD_API}?start_date=${monthStart}&end_date=${monthEnd}`).then(r => r.json()),
        fetch(INV_API).then(r => r.json()),
        fetch(`${QA_API}?start_date=${monthStart}&end_date=${monthEnd}`).then(r => r.json()),
        fetch(EQ_API).then(r => r.json()),
      ])

      const wos    = woRes.data      ?? []
      const prods  = prodAllRes.data ?? []
      const stocks = invRes.data     ?? []
      const qas    = qaRes.data      ?? []
      const eqs    = eqRes.data      ?? []

      const ongoing     = prods.filter(p => p.status === 'ONGOING').length
      const lowStock    = stocks.filter(s => s.current_stock <= 0 || (s.safety_stock > 0 && s.current_stock < s.safety_stock)).length
      const passRate    = qas.length > 0
        ? `${(qas.reduce((s, q) => s + (q.pass_rate ?? 0), 0) / qas.length).toFixed(1)}%`
        : '—'
      const eqRunning   = eqs.filter(e => e.status === 'RUNNING').length
      const eqBreakdown = eqs.filter(e => e.status === 'BREAKDOWN').length

      setKpi({ wo: wos.length, ongoing, lowStock, passRate, eqRunning, eqBreakdown })

      // 일별 차트 기준: 효과월 말일(현재월이면 오늘)에서 최근 14일 - 2026-07-24
      const now       = new Date()
      const monthLast = new Date(effY, effM + 1, 0)
      const anchor    = monthLast > now ? now : monthLast
      const anchorStr = fmtDate(anchor)
      const since14   = fmtDate(new Date(anchor.getTime() - 14 * 86400000))
      const recent = prods.filter(p => p.work_date >= since14 && p.work_date <= anchorStr)
      const dailyMap = {}
      recent.forEach(p => {
        const d = (p.work_date ?? '').slice(5)
        if (!d) return
        if (!dailyMap[d]) dailyMap[d] = { date: d, actual: 0, defect: 0 }
        dailyMap[d].actual += p.actual_qty ?? 0
        dailyMap[d].defect += p.defect_qty ?? 0
      })
      setProdChart(Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)))

      const matStocks = stocks
        .filter(s => s.item_type === 'RAW' || s.item_type === 'CONSUMABLE')
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 10)
        .map(s => ({
          name:   s.item_name ?? s.item_code,
          stock:  s.current_stock,
          safety: s.safety_stock ?? 0,
          low:    s.current_stock <= 0 || (s.safety_stock > 0 && s.current_stock < s.safety_stock),
        }))
      setInvChart(matStocks)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKpi() }, [loadKpi])

  const requestInsight = useCallback(async () => {
    setAiLoading(true)
    setAiError('')
    setAiInsight('')
    setTokenUsage(null)
    setGeneratedAt('')
    try {
      // 현재 언어를 백엔드에 전달 → 해당 언어로 인사이트 생성 - 2026-08-13
      const res  = await fetch(AI_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? (lang === 'en' ? 'Request failed' : '요청 실패'))
      const now = new Date().toISOString()
      setAiInsight(data.insight)
      setTokenUsage(data.token_usage)
      setRemainingCalls(data.remaining_calls)
      setGeneratedAt(now)
      firedLangs.current.add(lang)
      // 오늘 날짜 + 언어 키로 저장 — 화면 전환·사용자 전환 후에도 유지
      localStorage.setItem(insightKey(lang), JSON.stringify({
        insight:        data.insight,
        tokenUsage:     data.token_usage,
        remainingCalls: data.remaining_calls,
        generatedAt:    now,
      }))
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }, [lang])

  // 언어 변경 시 해당 언어 캐시로 화면 동기화(없으면 비움) - 2026-08-13
  useEffect(() => {
    const c = readCache(lang)
    setAiInsight(c?.insight ?? '')
    setTokenUsage(c?.tokenUsage ?? null)
    setRemainingCalls(c?.remainingCalls ?? null)
    setGeneratedAt(c?.generatedAt ?? '')
  }, [lang])

  // KPI 로드 완료 후, 현재 언어로 아직 생성 안 했고 캐시도 없으면 자동 생성 - 2026-08-13
  useEffect(() => {
    if (loading || firedLangs.current.has(lang)) return
    if (readCache(lang)) { firedLangs.current.add(lang); return }
    const hasData = kpi.wo > 0 || prodChart.length > 0
    if (hasData) {
      firedLangs.current.add(lang)
      requestInsight()
    }
  }, [loading, kpi.wo, prodChart.length, lang, requestInsight])

  return {
    loading, kpi, prodChart, invChart,
    aiInsight, aiLoading, aiError, tokenUsage, remainingCalls, generatedAt,
    requestInsight,
  }
}
