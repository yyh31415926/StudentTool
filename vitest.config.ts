import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // 与 tsconfig.json 的 paths（"@/*" -> "./src/*"）保持一致，
      // 让测试里能解析通过 `@/` 别名引入的值导入。
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
