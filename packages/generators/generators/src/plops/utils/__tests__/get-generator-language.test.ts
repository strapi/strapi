import path from 'node:path';
import { isUsingTypeScriptSync } from '@strapi/typescript-utils';

import getGeneratorLanguage from '../get-generator-language';

jest.mock('@strapi/typescript-utils', () => ({
  isUsingTypeScriptSync: jest.fn(),
}));

describe('getGeneratorLanguage', () => {
  const appRoot = '/app';
  const appPlop = {
    getDestBasePath: () => path.join(appRoot, 'src'),
  };
  const isUsingTypeScriptSyncMock = jest.mocked(isUsingTypeScriptSync);

  test('non-plugin generation checks the generate dir', () => {
    isUsingTypeScriptSyncMock.mockReturnValue(true);

    const language = getGeneratorLanguage({ filePath: 'api/{{ id }}' }, appPlop);

    expect(language).toBe('ts');
    expect(isUsingTypeScriptSyncMock).toHaveBeenCalledWith(appRoot);
  });

  test('in-app plugin generation checks the plugin server directory', () => {
    isUsingTypeScriptSyncMock.mockReturnValue(true);

    const language = getGeneratorLanguage(
      { plugin: 'my-plugin', filePath: 'plugins/{{ plugin }}/server/src' },
      appPlop
    );

    expect(language).toBe('ts');
    expect(isUsingTypeScriptSyncMock).toHaveBeenCalledWith(
      path.join(appRoot, 'src', 'plugins', 'my-plugin', 'server')
    );
  });

  test('standalone plugin generation checks the server directory from dir option', () => {
    const standalonePlop = {
      getDestBasePath: () => path.join('/plugin', 'server', 'src'),
    };

    isUsingTypeScriptSyncMock.mockReturnValue(true);

    const language = getGeneratorLanguage({ plugin: 'my-plugin', filePath: '.' }, standalonePlop);

    expect(language).toBe('ts');
    expect(isUsingTypeScriptSyncMock).toHaveBeenCalledWith(path.join('/plugin', 'server'));
  });

  test('returns js when no tsconfig is found', () => {
    isUsingTypeScriptSyncMock.mockReturnValue(false);

    const language = getGeneratorLanguage({ filePath: 'api/{{ id }}' }, appPlop);

    expect(language).toBe('js');
  });
});
