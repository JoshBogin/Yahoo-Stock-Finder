import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the .NET backend so the browser stays same-origin in dev.
    proxy: {
      '/api': 'http://localhost:5222',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/support/setup.ts'],
    // Tests always hit MSW, never the in-app mock data.
    env: { VITE_USE_MOCKS: 'false' },
    restoreMocks: true,
    coverage: {
      include: ['src/**'],
      // The entry point only mounts <App />; type declarations have no runtime code.
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
  },
})
