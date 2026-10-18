import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    fileParallelism: false,
    maxWorkers: 1,
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
