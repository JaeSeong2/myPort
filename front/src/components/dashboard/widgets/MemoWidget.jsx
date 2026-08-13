// 메모 위젯 — 자유 메모, 사용자별 자동 저장 - 2026-07-24
import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useLanguage } from '../../../context/LanguageContext'

const keyFor = (uid) => `mes_widget_memo_${(uid || 'guest').toLowerCase()}`

export default function MemoWidget() {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  const uid = currentUser?.user_id
  const [text, setText] = useState('')

  // 사용자 전환 시 해당 사용자 메모 로드
  useEffect(() => {
    try { setText(localStorage.getItem(keyFor(uid)) ?? '') } catch { setText('') }
  }, [uid])

  const onChange = (e) => {
    const v = e.target.value
    setText(v)
    try { localStorage.setItem(keyFor(uid), v) } catch {}
  }

  return (
    <div className="bg-surface border border-theme rounded-xl p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-primary mb-3 shrink-0">{t('widget.memo')}</h3>
      <textarea
        value={text}
        onChange={onChange}
        placeholder={t('widget.memoPh')}
        className="w-full flex-1 min-h-0 resize-none rounded-lg border border-theme bg-base px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-(--accent)"
      />
    </div>
  )
}
