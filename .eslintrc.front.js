module.exports = {
  parser: '@babel/eslint-parser',
  extends: ['@strapi/eslint-config/front'],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
    mocha: true,
  },
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  },
  globals: {
    strapi: false,
    window: false,
    cy: false,
    Cypress: false,
    expect: false,
    assert: false,
    chai: false,
    ENABLED_EE_FEATURES: false,
    // TODO: put all this in process.env in webpack to avoid having to set them here
    ADMIN_PATH: true,
    BACKEND_URL: true,
    PUBLIC_PATH: true,
    NODE_ENV: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
