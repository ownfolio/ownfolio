import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
    exclude: [...configDefaults.exclude, '.claude/**'],
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 4,
  },
})
