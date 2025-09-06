module.exports = {
  env: {
    node: true,
    es6: true,
  },
  globals: {
    require: "readonly",
    exports: "readonly",
    module: "readonly",
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {allowTemplateLiterals: true}],
    "max-len": "off",
    "no-unused-vars": "warn",
    "object-curly-spacing": "off",
    "indent": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
};
