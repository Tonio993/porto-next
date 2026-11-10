import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

export default defineConfig(({ command }) => ({
  main: {
    build: { rollupOptions: { output: { format: 'cjs' } } },
  },
  preload: {
    build: { rollupOptions: { output: { format: 'cjs' } } },
  },
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [
      react(),
      {
        name: 'porto-content-security-policy',
        transformIndexHtml(html) {
          return html
            .replace('__SCRIPT_POLICY__', command === 'serve' ? "'self' 'unsafe-inline'" : "'self'")
            .replace(
              '__CONNECT_POLICY__',
              command === 'serve' ? "'self' ws://localhost:* ws://127.0.0.1:*" : "'none'",
            )
        },
      },
    ],
  },
}))
