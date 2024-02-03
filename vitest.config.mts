import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 4,
  },
})
