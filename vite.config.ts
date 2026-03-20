import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    proxy: {
      '/pw-api': {
        target: 'https://api.penpencil.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pw-api/, ''),
        headers: {
          'Origin': 'https://www.pw.live',
          'Referer': 'https://www.pw.live/',
        },
      },
      '/api': 'http://localhost:5174',
    },
  },
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
})
