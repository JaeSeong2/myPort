// 스켈레톤 로딩 — 콘텐츠 자리표시자(shimmer). 텍스트/차트/카드 로딩에 재사용 - 2026-08-24
// .skeleton 클래스(index.css)가 테마 대응 shimmer 애니메이션을 담당.

// 기본 블록 — 크기/모양은 className·style로 지정 - 2026-08-24
export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

// 여러 줄 텍스트 자리표시자 — 마지막 줄은 짧게 - 2026-08-24
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}
