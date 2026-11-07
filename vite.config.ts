import { defineConfig } from 'vite';

// Relative base ("./") works on any GitHub Pages path (user/project sites, forks, custom domains).
// Override with BASE_PATH=/some/path/ if an absolute base is ever needed.
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  build: { target: 'es2022' },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
} as import('vite').UserConfig & { test: unknown });
