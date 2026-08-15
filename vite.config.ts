import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hurry-go-round/',
  test: { exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'] },
});
