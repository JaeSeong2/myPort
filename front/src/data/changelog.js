// 앱 버전 및 변경이력(새소식) — 배포 시 APP_VERSION과 public/version.json을 함께 올린다 - 2026-08-07
// · 새소식 탭: CHANGELOG를 표시, 마지막 본 버전(localStorage)과 APP_VERSION 비교로 미확인 배지
// · 새버전 토스트: 서버의 version.json.version과 APP_VERSION 비교(불일치 시 새로고침 안내)
export const APP_VERSION = '1.6.0'

export const CHANGELOG = [
  {
    version: '1.6.0', date: '2026-08-24',
    items: [
      '실시간 라인 현황 — 아이소메트릭 라인맵(2.5D) 추가',
    ],
  },
  {
    version: '1.5.0', date: '2026-08-13',
    items: [
      '문서 출력 개편 — 좌측 리스트 + 다중 선택 인쇄',
      '한/영 모드 전면 적용 (AI 인사이트·실시간 알림 포함)',
    ],
  },
  {
    version: '1.4.0', date: '2026-08-07',
    items: [
      '문서 출력 개편 — 좌측 문서 리스트(조회조건 기준 2그룹) + 다중 선택 인쇄',
      '조건형 문서 대상 선택 팝업(작업지시서·설비점검표) 및 인쇄 예정 장수 표시',
    ],
  },
  {
    version: '1.3.0', date: '2026-08-06',
    items: [
      'AI 비전 관제 추가 — 폰 카메라 → PC 실시간 사물 감지(브라우저 로컬 추론)',
    ],
  },
  {
    version: '1.2.0', date: '2026-08-02',
    items: [
      '실시간 Andon 보드 + 알림 센터(SSE)',
      'LOT 추적 QR — 생성·스캔·모바일 공개 조회',
    ],
  },
  {
    version: '1.1.0', date: '2026-08-01',
    items: [
      'AI 생산 인사이트 — KPI 집계 → 한국어 분석문',
    ],
  },
]
