'use strict';

const fse = require('fs-extra');
const { isUsingTypeScript } = require('@strapi/typescript-utils');
const getCustomAppConfigFile = require('../get-custom-app-config-file');

jest.mock('@strapi/typescript-utils', () => ({
  ...jest.requireActual('@strapi/typescript-utils'),
  isUsingTypeScript: jest.fn(),
}));

describe('getCustomAppConfigFile', () => {
  test('It should return undefined when the src/admin does no exist', async () => {
    const result = await getCustomAppConfigFile('/');

    expect(result).toBeUndefined();
  });

  test('It should return undefined when the app config file extension is not .js and useTypeScript is falsy', async () => {
    fse.readdir = jest.fn(() => {
      return ['app.example.js', 'webpack.config.js', 'app.ts', 'app.tsx'];
    });

    isUsingTypeScript.mockImplementation(() => false);

    const result = await getCustomAppConfigFile('/');

    expect(result).toBeUndefined();
  });

  test('It should return app.js when the app config file extension is not (.ts|.tsx) and useTypeScript is truthy', async () => {
    fse.pathExistsSync = jest.fn(() => {
      return true;
    });

    fse.readdir = jest.fn(() => {
      return ['app.js', 'webpack.config.js', 'app.example.ts', 'app.example.tsx'];
    });

    isUsingTypeScript.mockImplementation(() => true);

    const result = await getCustomAppConfigFile('/');

    expect(result).toBe('app.js');
  });

  test('It should return app.js when the app config file extension is .js and useTypeScript is falsy', async () => {
    fse.pathExistsSync = jest.fn(() => {
      return true;
    });

    fse.readdir = jest.fn(() => {
      return ['app.js', 'webpack.config.js', 'app.ts', 'app.tsx'];
    });

    isUsingTypeScript.mockImplementation(() => false);

    const result = await getCustomAppConfigFile('/');

    expect(result).toEqual('app.js');
  });

  test.each([
    ['app.ts', ['app.js', 'webpack.config.js', 'app.ts', 'app.example.tsx']],
    ['app.ts', ['app.ts', 'webpack.config.js', 'app.js', 'app.example.tsx']],
    ['app.ts', ['webpack.config.js', 'app.jsx', 'app.ts', 'app.example.tsx']],
    ['app.jsx', ['webpack.config.js', 'app.jsx', 'app.example.tsx']],
  ])(
    'It should return %s when the app config file extension is .ts and useTypeScript is truthy',
    async (expected, files) => {
      fse.readdir = jest.fn(() => files);

      isUsingTypeScript.mockImplementation(() => true);

      const result = await getCustomAppConfigFile('/');

      expect(result).toEqual(expected);
    }
  );
});
