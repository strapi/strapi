'use strict';

const fse = require('fs-extra');
const getCustomAppConfigFile = require('../get-custom-app-config-file');

describe('getCustomAppConfigFile', () => {
  test('It should return undefined when the app config file extension is not .js and useTypeScript is falsy', async () => {
    fse.readdir = jest.fn(() => {
      return ['app.example.js', 'webpack.config.js', 'app.ts', 'app.tsx'];
    });

    const result = await getCustomAppConfigFile('/', false);

    expect(result).toBeUndefined();
  });

  test('It should return undefined when the app config file extension is not (.ts|.tsx) and useTypeScript is truthy', async () => {
    fse.readdir = jest.fn(() => {
      return ['app.js', 'webpack.config.js', 'app.example.ts', 'app.example.tsx'];
    });

    const result = await getCustomAppConfigFile('/', true);

    expect(result).toBeUndefined();
  });

  test('It should return app.js when the app config file extension is .js and useTypeScript is falsy', async () => {
    fse.readdir = jest.fn(() => {
      return ['app.js', 'webpack.config.js', 'app.ts', 'app.tsx'];
    });

    const result = await getCustomAppConfigFile('/', false);

    expect(result).toEqual('app.js');
  });

  test('It should return (app.ts|app.tsx) when the app config file extension is .ts and useTypeScript is truthy', async () => {
    fse.readdir = jest.fn(() => {
      return ['app.js', 'webpack.config.js', 'app.ts', 'app.example.tsx'];
    });

    const result = await getCustomAppConfigFile('/', true);

    expect(result).toEqual('app.ts');

    fse.readdir = jest.fn(() => {
      return ['app.js', 'webpack.config.js', 'app.tsx'];
    });

    const otherResult = await getCustomAppConfigFile('/', true);

    expect(otherResult).toEqual('app.tsx');
  });
});
