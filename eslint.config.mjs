// @ts-check

import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      // "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores(["generated/"]),
);
