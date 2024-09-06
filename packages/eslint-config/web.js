const generateConfig = require("./generateConfig");
const _ = require("lodash");

const config = generateConfig("web-app");
config.overrides[0].extends.push("@rushstack/eslint-config/mixins/react");

module.exports = _.mergeWith({}, config, {
  settings: {
    react: {
      version: "16.14.0",
    },
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  overrides: [
    /*{
      "files": ["*.tsx", "*.ts", "*.jsx", "*.js"],
      "processor": "@graphql-eslint/graphql",
    },*/
    {
      "files": ["*.graphql"],
      "parser": "@graphql-eslint/eslint-plugin",
      "parserOptions": {
        "operations": ["./src/**/*.ts", "./src/**/*.tsx"]
      },
      "plugins": ["@graphql-eslint"],
      "extends": [
        "plugin:@graphql-eslint/schema-recommended", 
        "plugin:@graphql-eslint/operations-recommended"
      ],
      "rules": {
        "@graphql-eslint/known-directives": "off",
        "@graphql-eslint/no-unused-fragments": "off",
        "@graphql-eslint/require-id-when-available": "error",
        "@graphql-eslint/naming-convention": "off"
      }
    }
  ]
}, function customizer(objValue, srcValue) {
    if (_.isArray(objValue)) {
      return srcValue.concat(objValue);
    }
  }
);