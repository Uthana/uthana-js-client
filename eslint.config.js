import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/*.config.js", "**/*.config.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettier,
  {
    plugins: { import: eslintPluginImport },
    rules: {
      "import/extensions": ["error", "never", { js: "never", ts: "never" }],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
      },
    },
  },
);
