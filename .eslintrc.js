const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");

module.exports = [{
  files: ["**/*.ts"],
  languageOptions: {
    parser: typescriptParser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: {
    "@typescript-eslint": typescriptEslint,
  },
  rules: {
    "@typescript-eslint/naming-convention": "warn",
    "quotes": "warn",
    "curly": ["warn", "multi-line"],
    "eqeqeq": "warn",
    "no-throw-literal": "warn",
    "semi": "warn",
  },
}, {
  ignores: [
    "out/**",
    "dist/**",
    "**/*.d.ts",
  ],
}];
