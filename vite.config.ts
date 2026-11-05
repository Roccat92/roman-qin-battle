import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', sourcemap: true },
  test: { globals: true, environment: 'node' },
});
