import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 确保在 GitHub Pages 等子路径下能正常加载资源
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild', // 使用 esbuild 压缩，无需额外安装 terser
    chunkSizeWarningLimit: 1600
  }
});
