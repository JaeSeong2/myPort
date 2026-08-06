import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // react-grid-layout/react-draggable가 참조하는 process.env 폴리필 - 2026-07-25
  define: {
    'process.env': {},
  },
  server: {
    port: 5173,
    proxy: {
      // ws:true — WebSocket(카메라 릴레이) 업그레이드 요청도 백엔드로 프록시 - 2026-08-02
      '/api': { target: 'http://localhost:8000', ws: true },
    },
  },
})
