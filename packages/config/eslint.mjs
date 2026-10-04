import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

/**
 * Shared ESLint flat config. Rules here encode the readability conventions in CLAUDE.md:
 * small functions and files, no `any`, no nested ternaries, kebab-case filenames, ordered imports.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "_prototype/**",
      "packages/db/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs,js}"],
    plugins: { "import-x": importX, unicorn },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-console": "error",
      "no-nested-ternary": "error",
      "no-magic-numbers": [
        "warn",
        { ignore: [0, 1, -1, 2], ignoreArrayIndexes: true, enforceConst: true },
      ],
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 40, skipBlankLines: true, skipComments: true }],
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [{ pattern: "@forgely/**", group: "internal" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Named-constant files are where magic numbers are supposed to live.
    files: ["**/constants.ts", "**/tokens.ts"],
    rules: { "no-magic-numbers": "off", "max-lines-per-function": "off" },
  },
  {
    // Tests and config files may be long and use literals freely.
    files: ["**/*.test.ts", "**/*.config.{ts,mjs}"],
    rules: {
      "no-magic-numbers": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
    },
  },
  eslintConfigPrettier,
);
