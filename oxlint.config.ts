import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
  },
  ignorePatterns: [
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/routeTree.gen.ts",
  ],
  options: {
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
  plugins: ["typescript"],
  rules: {
    "eslint/no-unused-vars": "error",
    "typescript/no-floating-promises": "error",
  },
});
