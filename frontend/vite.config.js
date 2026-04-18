import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (
            id.includes('/react/')
            || id.includes('/react-dom/')
            || id.includes('/scheduler/')
            || id.includes('/use-sync-external-store/')
          ) {
            return 'vendor-react'
          }

          if (id.includes('recharts')) {
            return 'vendor-charts'
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n'
          }

          if (id.includes('react-router')) {
            return 'vendor-router'
          }

          if (id.includes('zustand')) {
            return 'vendor-state'
          }

          return 'vendor-misc'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9000',
      '/ws': { target: 'ws://localhost:9000', ws: true },
    },
  },
})
