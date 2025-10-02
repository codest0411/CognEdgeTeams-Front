import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    https: false, // Set to true for HTTPS if needed for WebRTC
    cors: true
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer', 'webrtc-adapter']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          webrtc: ['simple-peer', 'webrtc-adapter'],
          supabase: ['@supabase/supabase-js'],
          socket: ['socket.io-client']
        }
      }
    }
  }
})
