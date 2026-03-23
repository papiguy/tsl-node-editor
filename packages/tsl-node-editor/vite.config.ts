import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({ tsconfigPath: './tsconfig.json' }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TSLNodeEditor',
      formats: ['es'],
      fileName: 'tsl-node-editor',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'three', /^three\//],
    },
    cssFileName: 'style',
  },
})
