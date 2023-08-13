import { defineConfig } from 'vite'
import path from 'node:path'

import react from '@vitejs/plugin-react'
import linaria from '@linaria/vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    linaria(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        '@linaria/core',
        '@linaria/react',
        'clsx',
        'fast-equals',
        'react',
        'react-dom',
        'react-draggable',
        'react-resizable',
      ],
      // output: {
      //   globals: {
      //     react: 'React',
      //     'react-dom': 'ReactDOM',
      //   },
      // },
    },
  },
})
