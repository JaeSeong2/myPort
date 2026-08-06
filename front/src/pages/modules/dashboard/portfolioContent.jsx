// 포트폴리오 위젯 렌더링 내용 — 소개/주요 기능/기술 스택 요약 - 2026-07-24
import {
  Factory, ClipboardList, Package, ShieldCheck, GitMerge,
  QrCode, Activity, Sparkles, ScanEye,
} from 'lucide-react'

// 주요 기능 — 기본 MES 모듈 + 실시간/AI 확장 기능 반영 - 2026-08-02
const FEATURES = [
  { icon: <ClipboardList size={15} />, label: '작업지시·생산',   desc: '지시·배정부터 실적·백플러시 자동 재고 반영' },
  { icon: <Package size={15} />,       label: '재고/자재',       desc: '입출고·재고 현황 실시간 조회' },
  { icon: <ShieldCheck size={15} />,   label: '품질 검사',       desc: '수입·공정·최종 검사 결과 관리' },
  { icon: <GitMerge size={15} />,      label: 'BOM·공정 흐름',   desc: '자재 소요량·공정 순서 정의' },
  { icon: <QrCode size={15} />,        label: 'LOT 추적 (QR)',   desc: '공정 이력 추적 + QR 모바일 조회' },
  { icon: <Activity size={15} />,      label: '실시간 Andon·알림', desc: 'SSE 기반 설비 현황·이상 알림 실시간' },
  { icon: <Sparkles size={15} />,      label: 'AI 생산 인사이트', desc: '월간 KPI 자동 분석 리포트' },
  { icon: <ScanEye size={15} />,       label: 'AI 비전 관제',    desc: '폰 카메라 실시간 영상 + 객체 감지' },
]

// 기술 스택 핵심 — 카테고리별 주요 기술만 - 2026-07-28
const TECH = [
  { group: 'Frontend', items: ['React 19', 'Vite', 'Tailwind CSS'] },
  { group: 'Backend',  items: ['FastAPI', 'Motor (async)'] },
  { group: 'Database', items: ['MongoDB Atlas'] },
  { group: 'AI',       items: ['Groq', 'Llama 3.3 70B'] },
]

// 포트폴리오 전체를 하나의 위젯 내용으로 - 2026-07-24
export const PortfolioContent = (
  <div className="flex flex-col gap-6">
    {/* 프로젝트 소개 */}
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
        style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
        <Factory size={12} />
        Manufacturing Execution System
      </div>
      <h1 className="text-primary text-2xl font-bold mb-2"> MES<br /></h1>
      <p className="text-muted text-sm leading-relaxed">
        자동차부품 제조 공정의 작업지시부터 생산·재고·품질까지<br />
        통합 관리하는 MES 풀스택 포트폴리오 프로젝트입니다.
      </p>
    </div>

    {/* 주요 기능 */}
    <div>
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">주요 기능</h3>
      <div className="grid grid-cols-2 gap-2">
        {FEATURES.map((f, i) => (
          <div key={i} className="bg-surface border border-theme rounded-lg p-3 flex gap-2.5">
            <span className="text-muted mt-0.5 shrink-0">{f.icon}</span>
            <div>
              <div className="text-sm font-medium text-primary">{f.label}</div>
              <div className="text-xs text-muted mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* 기술 스택 핵심 */}
    <div>
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">기술 스택</h3>
      <div className="bg-surface border border-theme rounded-lg p-4 flex flex-col gap-3">
        {TECH.map((t) => (
          <div key={t.group} className="flex items-center gap-3">
            <span className="text-xs text-muted w-20 shrink-0">{t.group}</span>
            <div className="flex flex-wrap gap-1.5">
              {t.items.map((it) => (
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
