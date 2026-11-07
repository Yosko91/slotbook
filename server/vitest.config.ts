import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // all API tests use the same database, so files run one by one
    fileParallelism: false,
  },
});
