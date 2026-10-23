import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/type-maniac/',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
