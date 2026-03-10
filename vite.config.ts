import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://192.168.1.40:8000', // Tạm thời hardcode để đảm bảo chạy ngay
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
