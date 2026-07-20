import path from 'node:path';
import * as tsUtils from '@strapi/typescript-utils';

import getGeneratorLanguage from '../get-generator-language';

describe('getGeneratorLanguage', () => {
  const appRoot = '/app';
  const appPlop = {
    getDestBasePath: () => path.join(appRoot, 'src'),
  };
  let isUsingTypeScriptSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    isUsingTypeScriptSyncSpy = jest.spyOn(tsUtils, 'isUsingTypeScriptSync');
  });

  afterEach(() => {
    isUsingTypeScriptSyncSpy.mockRestore();
  });

  test('non-plugin generation checks the generate dir', () => {
    isUsingTypeScriptSyncSpy.mockReturnValue(true);

    const language = getGeneratorLanguage({ filePath: 'api/{{ id }}' }, appPlop);

    expect(language).toBe('ts');
    expect(isUsingTypeScriptSyncSpy).toHaveBeenCalledWith(appRoot);
  });

  test('in-app plugin generation checks the plugin server directory', () => {
    isUsingTypeScriptSyncSpy.mockReturnValue(true);

    const language = getGeneratorLanguage(
      { plugin: 'my-plugin', filePath: 'plugins/{{ plugin }}/server/src' },
      appPlop
    );

    expect(language).toBe('ts');
    expect(isUsingTypeScriptSyncSpy).toHaveBeenCalledWith(
      path.join(appRoot, 'src', 'plugins', 'my-plugin', 'server')
    );
  });

  test('standalone plugin generation checks the server directory from dir option', () => {
    const standalonePlop = {
      getDestBasePath: () => path.join('/plugin', 'server', 'src'),
    };

    isUsingTypeScriptSyncSpy.mockReturnValue(true);

    const language = getGeneratorLanguage({ plugin: 'my-plugin', filePath: '.' }, standalonePlop);

    expect(language).toBe('ts');
    expect(isUsingTypeScriptSyncSpy).toHaveBeenCalledWith(path.join('/plugin', 'server'));
  });

  test('returns js when no tsconfig is found', () => {
    isUsingTypeScriptSyncSpy.mockReturnValue(false);

    const language = getGeneratorLanguage({ filePath: 'api/{{ id }}' }, appPlop);

    expect(language).toBe('js');
  });
});
