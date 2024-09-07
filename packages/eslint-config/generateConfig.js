require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = function generateConfig(type) {
  return {
    overrides: [
      {
        files: ["*.tsx", "*.ts"],
        extends: [ "@rushstack/eslint-config/profile/" + type],
        plugins: ["import", "prettier"],
        rules: {
          "no-void": "off",
          "@typescript-eslint/typedef": "off",
          "prettier/prettier": "error",
          "import/default": "error",
          "import/no-self-import": "error",
          "import/export": "error",
          "import/no-named-as-default": "error",
          "import/no-named-as-default-member": "error",
          "import/no-deprecated": "warn",
          "import/no-mutable-exports": "error",
          "import/first": "error",
          "import/order": [
            "error",
            {
              "newlines-between": "always",
              "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
              "pathGroups": [
                {
                  "pattern": "~**/**",
                  "group": "internal"
                },
                {
                  "pattern": "~*",
                  "group": "internal"
                },
                {
                  "pattern": "@ubermouse/**/**",
                  "group": "internal",
                  "position": "before"
                }
              ],
              "alphabetize": {
                "order": "asc"
              }
            }
          ],
          "import/newline-after-import": "error",
          "@typescript-eslint/consistent-type-imports": [
            "error",
            {
              "fixStyle": "inline-type-imports",
              "disallowTypeAnnotations": false
            }
          ],
          "@typescript-eslint/consistent-type-exports": [
            "error",
            {
              "fixMixedExportsWithInlineTypeSpecifier": true
            }
          ],
          "@typescript-eslint/camelcase": "off",
          "@typescript-eslint/no-unused-vars": [
            "error",
            { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }
          ],
          "@typescript-eslint/ban-ts-comment": ["error", {
            "ts-expect-error": "allow-with-description",
            "ts-ignore": "allow-with-description",
            "ts-nocheck": "allow-with-description"
          }],
          "@typescript-eslint/naming-convention": [
           "error",
             {
               "selector": "interface",
               "format": ["PascalCase"],
             }
           ]
        },
        "settings": {
         "import/extensions": [".ts", ".tsx"],
         "import/ignore": ["node_modules"],
         "import/internal-regex": "^@ubermouse/",
         "import/resolver": "typescript",
         "import/external-module-folders": ["node_modules", "node_modules/@types"],
          "react": {
            "version": "18.0.0"
          }
        },
      },
    ]
  };
}