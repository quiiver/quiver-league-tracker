module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    browser: false
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module"
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "eslint-config-prettier"
  ],
  ignorePatterns: ["dist", "node_modules"],
  overrides: [
    {
      files: ["**/*.tsx"],
      env: {
        browser: true
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  ]
};
