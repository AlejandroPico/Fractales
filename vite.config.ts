import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  base: '/Fractales/',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    target: 'es2022',
    assetsInlineLimit: 4096,
    rollupOptions: {
      external: ['three']
    }
  }
});
