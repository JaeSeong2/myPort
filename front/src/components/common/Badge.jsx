// 상태 뱃지 공통 컴포넌트 - 2026-05-23
import { useLanguage } from '../../context/LanguageContext'

export const STATUS_BADGE = {
  PENDING: { labelKey: 'opt.status.PENDING', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  IN_PROG: { labelKey: 'opt.status.IN_PROG', color: 'var(--accent)',         bg: 'var(--accent-subtle)' },
  STOPPED: { labelKey: 'opt.status.STOPPED', color: 'var(--warning)',        bg: 'rgba(251,191,36,0.1)' },
  DONE:    { labelKey: 'opt.status.DONE',    color: 'var(--success)',        bg: 'rgba(74,222,128,0.1)' },
}

export const TYPE_BADGE = {
  NORMAL: { labelKey: 'opt.type.NORMAL', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  URGENT: { labelKey: 'opt.type.URGENT', color: 'var(--danger)',         bg: 'var(--danger-subtle)' },
  REWORK: { labelKey: 'opt.type.REWORK', color: 'var(--warning)',        bg: 'rgba(251,191,36,0.1)' },
}

export const PRIORITY_BADGE = {
  HIGH:   { labelKey: 'opt.priority.HIGH',   color: 'var(--danger)',         bg: 'var(--danger-subtle)' },
  MEDIUM: { labelKey: 'opt.priority.MEDIUM', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  LOW:    { labelKey: 'opt.priority.LOW',    color: 'var(--text-muted)',     bg: 'var(--bg-elevated)' },
}

export default function Badge({ value, map }) {
  const { t } = useLanguage()
  const cfg = map[value] ?? { labelKey: value, color: 'var(--text-muted)', bg: 'var(--bg-elevated)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {t(cfg.labelKey)}
    </span>
  )
}
