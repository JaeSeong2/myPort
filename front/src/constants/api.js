// API 기본 URL - 2026-05-23
// .env: VITE_API_BASE=http://localhost:8000 (개발)
// .env.production: VITE_API_BASE=https://your-backend.com (배포)
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''
