// 포트폴리오 위젯 렌더링 내용 — 소개/주요 기능/기술 스택 요약 - 2026-07-24
// 로케일 기반 전환: 정적 JSX → 컴포넌트(t 사용) - 2026-08-13
import {
  Factory, ClipboardList, Package, ShieldCheck, GitMerge,
  QrCode, Activity, Sparkles, ScanEye,
} from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

// 주요 기능 — 아이콘 + 로케일 키(라벨/설명) - 2026-08-13
const FEATURES = [
  { icon: <ClipboardList size={15} />, labelKey: 'pf.f.wo.label',    descKey: 'pf.f.wo.desc' },
  { icon: <Package size={15} />,       labelKey: 'pf.f.inv.label',   descKey: 'pf.f.inv.desc' },
  { icon: <ShieldCheck size={15} />,   labelKey: 'pf.f.qa.label',    descKey: 'pf.f.qa.desc' },
  { icon: <GitMerge size={15} />,      labelKey: 'pf.f.bom.label',   descKey: 'pf.f.bom.desc' },
  { icon: <QrCode size={15} />,        labelKey: 'pf.f.lot.label',   descKey: 'pf.f.lot.desc' },
  { icon: <Activity size={15} />,      labelKey: 'pf.f.andon.label', descKey: 'pf.f.andon.desc' },
  { icon: <Sparkles size={15} />,      labelKey: 'pf.f.ai.label',    descKey: 'pf.f.ai.desc' },
  { icon: <ScanEye size={15} />,       labelKey: 'pf.f.vision.label', descKey: 'pf.f.vision.desc' },
]

// 기술 스택 핵심 — 카테고리·기술명은 고유명이라 번역하지 않음 - 2026-07-28
const TECH = [
  { group: 'Frontend', items: ['React 19', 'Vite', 'Tailwind CSS'] },
  { group: 'Backend',  items: ['FastAPI', 'Motor (async)'] },
  { group: 'Database', items: ['MongoDB Atlas'] },
  { group: 'AI',       items: ['Groq', 'Llama 3.3 70B'] },
]

// 포트폴리오 전체를 하나의 위젯 내용으로 - 2026-07-24
export function PortfolioContent() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-6">
      {/* 프로젝트 소개 */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
          style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
          <Factory size={12} />
          Manufacturing Execution System
        </div>
        <h1 className="text-primary text-2xl font-bold mb-2"> MES<br /></h1>
        <p className="text-muted text-sm leading-relaxed">{t('pf.intro')}</p>
      </div>

      {/* 주요 기능 */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('pf.features')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-surface border border-theme rounded-lg p-3 flex gap-2.5">
              <span className="text-muted mt-0.5 shrink-0">{f.icon}</span>
              <div>
                <div className="text-sm font-medium text-primary">{t(f.labelKey)}</div>
                <div className="text-xs text-muted mt-0.5">{t(f.descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 기술 스택 핵심 */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t('pf.tech')}</h3>
        <div className="bg-surface border border-theme rounded-lg p-4 flex flex-col gap-3">
          {TECH.map((grp) => (
            <div key={grp.group} className="flex items-center gap-3">
              <span className="text-xs text-muted w-20 shrink-0">{grp.group}</span>
              <div className="flex flex-wrap gap-1.5">
                {grp.items.map((it) => (
                  <span key={it}
                    className="text-xs font-medium px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
