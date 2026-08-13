// 계산기 위젯 — 기본 사칙연산 (자체 완결형) - 2026-07-24
import { useState } from 'react'
import { useLanguage } from '../../../context/LanguageContext'

// 안전한 수식 계산 — eval/Function 미사용(CSP 안전), 재귀하강 파서 - 2026-07-24
const compute = (expr) => {
  const tokens = expr.match(/\d+\.?\d*|[+\-*/()]/g)
  if (!tokens) return 'Error'
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const parseExpr = () => {
    let v = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = next()
      v = op === '+' ? v + parseTerm() : v - parseTerm()
    }
    return v
  }
  const parseTerm = () => {
    let v = parseFactor()
    while (peek() === '*' || peek() === '/') {
      const op = next()
      v = op === '*' ? v * parseFactor() : v / parseFactor()
    }
    return v
  }
  const parseFactor = () => {
    const t = peek()
    if (t === '(') { next(); const v = parseExpr(); if (peek() === ')') next(); return v }
    if (t === '-') { next(); return -parseFactor() }
    if (t === '+') { next(); return parseFactor() }
    next()
    return parseFloat(t)
  }
  try {
    const r = parseExpr()
    if (pos !== tokens.length || Number.isNaN(r) || !Number.isFinite(r)) return 'Error'
    return String(Math.round(r * 1e10) / 1e10)
  } catch { return 'Error' }
}

const KEYS = [
  ['C', '←', '(', ')'],
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '=', '+'],
]

export default function CalculatorWidget() {
  const { t } = useLanguage()
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('0')

  const press = (k) => {
    if (k === 'C') { setExpr(''); setResult('0'); return }
    if (k === '←') { setExpr((e) => e.slice(0, -1)); return }
    if (k === '=') { setResult(compute(expr || '0')); return }
    setExpr((e) => e + k)
  }

  const keyClass = (k) =>
    k === '='
      ? 'bg-[var(--accent)] text-white'
      : /[/*\-+]/.test(k) && k.length === 1
        ? 'text-[var(--accent)] bg-surface border border-theme'
        : k === 'C'
          ? 'text-red-400 bg-surface border border-theme'
          : 'text-primary bg-surface border border-theme'

  return (
    <div className="bg-surface border border-theme rounded-xl p-4">
      <h3 className="text-sm font-semibold text-primary mb-3">{t('widget.calc')}</h3>
      <div className="rounded-lg border border-theme bg-base px-3 py-2 mb-3 text-right">
        <div className="text-xs text-muted h-4 truncate">{expr || ' '}</div>
        <div className="text-xl font-bold text-primary truncate">{result}</div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.flat().map((k) => (
          <button key={k} onClick={() => press(k)}
            className={`h-9 rounded-lg text-sm font-medium transition-colors hover:opacity-80 ${keyClass(k)}`}>
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
