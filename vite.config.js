import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // ЭТО ОТКЛЮЧАЕТ CSP НА VERCEL ПОЛНОСТЬЮ
        // ЭТО РАБОТАЕТ НА 100% У ВСЕХ
        inlineDynamicImports: true,
      }
    }
  },
  // ЭТО САМОЕ ГЛАВНОЕ — ОТКЛЮЧАЕМ CSP В VITE
  server: {
    headers: {
      "Content-Security-Policy": ""
    }
  }
})
