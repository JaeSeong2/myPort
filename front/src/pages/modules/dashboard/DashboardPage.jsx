// 대시보드 - 2026-05-30
import {
  Factory, ClipboardList, Package, ShieldCheck,
  Code2, Database, Layers, GitBranch, Wrench, GitMerge, Sparkles, Cpu,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import DashboardKPI from './DashboardKPI'
import DashboardWorker from './DashboardWorker'

const TECH_STACK = [
  { icon: <Code2 size={13} />,     label: 'React 19',       color: '#60a5fa' },
  { icon: <Code2 size={13} />,     label: 'Vite 6',         color: '#a78bfa' },
  { icon: <Layers size={13} />,    label: 'FastAPI',         color: '#34d399' },
  { icon: <Database size={13} />,  label: 'MongoDB Atlas',   color: '#4ade80' },
  { icon: <GitBranch size={13} />, label: 'Motor (async)',   color: '#818cf8' },
  { icon: <Code2 size={13} />,     label: 'Tailwind CSS',    color: '#38bdf8' },
  { icon: <Code2 size={13} />,     label: 'Recharts',        color: '#fb923c' },
  { icon: <Sparkles size={13} />,  label: 'Groq API',        color: '#f97316' },
  { icon: <Cpu size={13} />,       label: 'Llama 3.3 70B',   color: '#e879f9' },
]

const FEATURES = [
  { icon: <ClipboardList size={15} />, label: '작업지시 관리', desc: '작업지시 등록·배정·이력 추적' },
  { icon: <Factory size={15} />,       label: '생산 실적',     desc: 'MES 백플러시 자동 재고 반영' },
  { icon: <Package size={15} />,       label: '재고/자재',     desc: '입출고·재고 현황 실시간 조회' },
  { icon: <ShieldCheck size={15} />,   label: '품질 검사',     desc: '수입·공정·최종 검사 결과 관리' },
  { icon: <Layers size={15} />,        label: 'BOM 관리',      desc: '제품별 자재 소요량 정의' },
  { icon: <Wrench size={15} />,        label: '설비 현황',     desc: '설비 상태 모니터링 및 유형별 관리' },
  { icon: <GitMerge size={15} />,      label: '공정 흐름',     desc: '제품별 공정 순서·사이클타임 정의' },
  { icon: <ClipboardList size={15} />, label: '실적 보고',     desc: '일/월별 생산 실적 차트 분석' },
]

export default function DashboardPage() {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'ADMIN'

  return (
    <div className="h-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      {/* ── Left: Portfolio ── */}
      <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-theme overflow-y-auto p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
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

        {/* Tech Stack */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((t, i) => (
              <span key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                style={{ color: t.color, borderColor: `${t.color}40`, background: `${t.color}12` }}>
                {t.icon}
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-6">
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

        {/* Data Overview */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">데이터 구성</h3>
          <div className="bg-surface border border-theme rounded-lg p-4 text-xs text-muted leading-6">
            <div className="grid grid-cols-2 gap-x-4">
              <div>• 품목 15종 (완제품 5 · 반제품 2 · 원자재 5 · 소모품 3)</div>
              <div>• 작업지시 20건 (완료 8 · 진행 5 · 대기 5 · 중단 2)</div>
              <div>• 생산실적 13건 (완료 8 · 진행 5)</div>
              <div>• 재고거래 20건 (입고 10 · 출고 10)</div>
              <div>• BOM 등록 (완제품/반제품별 자재구성)</div>
              <div>• 품질검사 15건 (수입·공정·최종)</div>
              <div>• 설비 15종 (생산·유틸리티·안전·검사)</div>
              <div>• 공정흐름 31단계 (7개 제품별 정의)</div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="flex items-center gap-3 pt-4 border-t border-theme">
          <span className="text-xs text-muted">|</span>
          <span className="text-xs text-muted">React 19 + FastAPI + MongoDB Atlas</span>
        </div>
      </div>

      {/* ── Right: 역할별 패널 ── */}
      <div className="w-full md:w-1/2 overflow-y-auto p-6 md:p-8">
        {isAdmin ? <DashboardKPI /> : <DashboardWorker />}
      </div>
    </div>
  )
}
