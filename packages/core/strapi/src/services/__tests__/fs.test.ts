import path from 'path';
import fse from 'fs-extra';
import fs from '../fs';

jest.mock('fs-extra', () => ({
  ensureFile: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
}));

describe('Strapi fs utils', () => {
  const strapi = {
    dirs: { dist: { root: '/tmp' }, app: { root: '/tmp' } },
  };

  test('Provides new functions', () => {
    const strapiFS = fs(strapi);

    expect(strapiFS.writeAppFile).toBeInstanceOf(Function);
    expect(strapiFS.writePluginFile).toBeInstanceOf(Function);
  });

  describe('Write App File', () => {
    test('Makes sure the path exists and writes', async () => {
      const strapiFS = fs(strapi);

      const content = '';

      await strapiFS.writeAppFile('test', content);

      expect(fse.ensureFile).toHaveBeenCalledWith(path.join('/', 'tmp', 'test'));
      expect(fse.writeFile).toHaveBeenCalledWith(path.join('/', 'tmp', 'test'), content);
    });

    test('Normalize the path to avoid relative access to folders in parent directories', async () => {
      const strapiFS = fs(strapi);

      const content = '';

      await strapiFS.writeAppFile('../../test', content);

      expect(fse.ensureFile).toHaveBeenCalledWith(path.join('/', 'tmp', 'test'));
      expect(fse.writeFile).toHaveBeenCalledWith(path.join('/', 'tmp', 'test'), content);
    });

    test('Works with array path', async () => {
      const strapiFS = fs(strapi);

      const content = '';

      await strapiFS.writeAppFile(['test', 'sub', 'path'], content);

      expect(fse.ensureFile).toHaveBeenCalledWith(path.join('/', 'tmp', 'test', 'sub', 'path'));
      expect(fse.writeFile).toHaveBeenCalledWith(
        path.join('/', 'tmp', 'test', 'sub', 'path'),
        content
      );
    });
  });

  describe('Write Plugin File', () => {
    test('Scopes the writes in the extensions folder', async () => {
      const strapiFS = fs(strapi);

      const content = '';

      strapiFS.writeAppFile = jest.fn(() => Promise.resolve());

      await strapiFS.writePluginFile('users-permissions', ['test', 'sub', 'path'], content);

      expect(strapiFS.writeAppFile).toHaveBeenCalledWith(
        'extensions/users-permissions/test/sub/path',
        content
      );
    });
  });
});
