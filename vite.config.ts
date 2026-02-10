import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    cssCodeSplit: false, // important if you ever add CSS
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app.js',
        assetFileNames: '[name][extname]'
      },
      input: {
        main: 'index.html',
        toc: 'toc.html'
      }
    }
  }
})
