import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // pose-detection이 정적 import하는 @mediapipe/pose를 더미로 대체 — MoveNet만 사용 - 2026-08-31
      '@mediapipe/pose': fileURLToPath(new URL('./src/stubs/mediapipe-pose.js', import.meta.url)),
    },
  },
  // react-grid-layout/react-draggable가 참조하는 process.env 폴리필 - 2026-07-25
  define: {
    'process.env': {},
  },
  server: {
    host: true,            // LAN·터널에서 접근 허용(0.0.0.0 바인딩) - 2026-08-02
    port: 5173,
    // 임시 HTTPS 터널 도메인(trycloudflare/ngrok/localtunnel 등) 허용 — 폰 카메라 테스트용 - 2026-08-02
    allowedHosts: true,
    proxy: {
      // ws:true — WebSocket(카메라 릴레이) 업그레이드 요청도 백엔드로 프록시 - 2026-08-02
      '/api': { target: 'http://localhost:8000', ws: true },
    },
  },
})
