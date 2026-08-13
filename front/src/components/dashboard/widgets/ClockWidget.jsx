// 시계 / 날짜 위젯 — 매초 갱신되는 디지털 시계 + 오늘 날짜 - 2026-07-24
import { useState, useEffect } from 'react'
import { useLanguage } from '../../../context/LanguageContext'

export default function ClockWidget() {
  const { t } = useLanguage()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const tm = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tm)
  }, [])

  const dow = t('widget.dow').split(',')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const dateStr = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')} (${dow[now.getDay()]})`

  return (
    <div className="bg-surface border border-theme rounded-xl p-4 flex flex-col items-center justify-center gap-1">
      <h3 className="text-sm font-semibold text-primary self-start mb-1">{t('widget.clock')}</h3>
      <div className="text-3xl font-bold text-primary tabular-nums tracking-tight">
        {hh}:{mm}<span className="text-xl text-muted">:{ss}</span>
      </div>
      <div className="text-xs text-muted">{dateStr}</div>
    </div>
  )
}
