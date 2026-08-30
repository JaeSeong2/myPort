// 명령 팔레트 — Ctrl/Cmd+K 로 어디서든 페이지 즉시 이동 - 2026-08-24
// menuConfig를 평면화해 검색 + 키보드 내비게이션 제공. 전역 단축키 + 커스텀 이벤트('command-palette:open')로 열림.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { menuConfig } from '../../data/menuConfig'
import { useLanguage } from '../../context/LanguageContext'

// menuConfig → 이동 가능한 리프 항목 평면화(부모 라벨을 그룹으로 유지) - 2026-08-24
function flatten(items) {
  const out = []
  for (const it of items) {
    if (it.path) out.push({ path: it.path, labelKey: it.labelKey, label: it.label, parentKey: null, parentLabel: null, wip: it.wip })
    if (it.children) for (const c of it.children) {
      out.push({ path: c.path, labelKey: c.labelKey, label: c.label, parentKey: it.labelKey, parentLabel: it.label, wip: c.wip })
    }
  }
  return out
}
const ALL = flatten(menuConfig)

export default function CommandPalette() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const [sel, setSel]     = useState(0)
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  const close = useCallback(() => { setOpen(false); setQuery(''); setSel(0) }, [])

  // 표시 라벨(로케일) 계산 + 검색 필터 - 2026-08-24
  const results = useMemo(() => {
    const withLabels = ALL.map((it) => ({
      ...it,
      label: it.labelKey ? t(it.labelKey) : it.label,
      group: it.parentKey ? t(it.parentKey) : (it.parentLabel ?? ''),
    }))
    const q = query.trim().toLowerCase()
    if (!q) return withLabels
    return withLabels.filter((it) =>
      it.label.toLowerCase().includes(q) ||
      it.group.toLowerCase().includes(q) ||
      it.path.toLowerCase().includes(q)
    )
  }, [query, t])

  // 전역 단축키(Ctrl/Cmd+K) 토글 + 커스텀 이벤트로 열기 - 2026-08-24
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('command-palette:open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('command-palette:open', onOpen)
    }
  }, [])

  // 열릴 때 입력 포커스 + 상태 초기화 - 2026-08-24
  useEffect(() => {
    if (open) { setQuery(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 0) }
  }, [open])

  // 쿼리 변경 시 선택 맨 위로
  useEffect(() => { setSel(0) }, [query])

  // 선택 항목 스크롤 into view — 키보드 이동 시 화면 밖으로 나가지 않게 - 2026-08-24
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [sel, open])

  const go = (item) => { if (!item) return; navigate(item.path); close() }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown')      { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter')     { e.preventDefault(); go(results[sel]) }
    else if (e.key === 'Escape')    { e.preventDefault(); close() }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[12vh] px-4 animate-overlay-in"
      style={{ background: 'rgba(0,0,0,0.45)', zIndex: 300 }}
      onMouseDown={close}
      role="dialog" aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-surface border border-theme rounded-xl shadow-2xl overflow-hidden animate-pop-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-2 px-3.5 border-b border-theme">
          <Search size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('cmd.placeholder')}
            className="flex-1 bg-transparent py-3.5 text-sm text-primary outline-none"
          />
          <kbd className="text-[10px] text-muted border border-theme rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
        </div>

        {/* 결과 리스트 */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">{t('cmd.empty')}</div>
          ) : (
            results.map((it, i) => (
              <button
                key={it.path}
                data-idx={i}
                onMouseEnter={() => setSel(i)}
                onClick={() => go(it)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors cursor-pointer ${i === sel ? 'bg-elevated' : ''}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: i === sel ? 'var(--accent)' : 'transparent' }} />
                <span className="text-sm text-primary truncate">{it.label}</span>
                {it.group && <span className="text-xs text-muted truncate ml-1">· {it.group}</span>}
                {it.wip && <span className="text-[10px] text-muted border border-theme rounded px-1 py-0.5 ml-1 shrink-0">WIP</span>}
                {i === sel && <CornerDownLeft size={13} className="text-muted ml-auto shrink-0" />}
              </button>
            ))
          )}
        </div>

        {/* 푸터 — 키보드 힌트 */}
        <div className="flex items-center gap-3 px-3.5 py-2 border-t border-theme text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <kbd className="border border-theme rounded px-1">↑</kbd>
            <kbd className="border border-theme rounded px-1">↓</kbd> {t('cmd.selMove')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-theme rounded px-1">↵</kbd> {t('cmd.selOpen')}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <kbd className="border border-theme rounded px-1">esc</kbd> {t('cmd.selClose')}
          </span>
        </div>
      </div>
    </div>
  )
}
