import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      shared: path.resolve(currentDir, "../shared/src/index.ts"),
    },
  },
});
