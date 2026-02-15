import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    // Isolate tests to avoid state leakage between modules
    pool: 'forks',
  },
});
