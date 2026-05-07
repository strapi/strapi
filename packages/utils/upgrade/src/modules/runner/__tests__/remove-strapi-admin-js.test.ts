/* eslint-disable import/first */

import path from 'node:path';
import { vol, fs } from 'memfs';

jest.mock('node:fs', () => fs);

import removeStrapiAdminJsTransform from '../../../../resources/codemods/5.0.0/remove-strapi-admin-js.code';

const cwd = '/__unit_tests__/plugin';

const pluginVolume = {
  'package.json': JSON.stringify({
    name: 'test-plugin',
    version: '1.0.0',
    strapi: { kind: 'plugin' },
  }),
  server: {
    'index.js': '// server',
  },
  admin: {
    'strapi-admin.js': 'module.exports = () => {};',
  },
  'strapi-admin.js': 'module.exports = () => {};',
};

describe('Runner (code)', () => {
  describe('remove-strapi-admin-js codemod', () => {
    beforeEach(() => {
      vol.reset();
      vol.fromNestedJSON(pluginVolume, cwd);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('unlinkSync removes root strapi-admin.js only', () => {
      const rootAdmin = path.join(cwd, 'strapi-admin.js');
      const nestedAdmin = path.join(cwd, 'admin', 'strapi-admin.js');

      expect(vol.existsSync(rootAdmin)).toBe(true);
      expect(vol.existsSync(nestedAdmin)).toBe(true);

      removeStrapiAdminJsTransform(
        { path: rootAdmin, source: 'module.exports = () => {};' },
        // Transform ignores api for this codemod
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        { projectRoot: cwd, dry: false }
      );

      expect(vol.existsSync(rootAdmin)).toBe(false);
      expect(vol.existsSync(nestedAdmin)).toBe(true);
    });

    test('skips unlink in dry mode', () => {
      const rootAdmin = path.join(cwd, 'strapi-admin.js');

      removeStrapiAdminJsTransform(
        { path: rootAdmin, source: 'module.exports = () => {};' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        { projectRoot: cwd, dry: true }
      );

      expect(vol.existsSync(rootAdmin)).toBe(true);
    });

    test('does not touch nested strapi-admin.js when transforming that path', () => {
      const nestedAdmin = path.join(cwd, 'admin', 'strapi-admin.js');

      removeStrapiAdminJsTransform(
        { path: nestedAdmin, source: 'module.exports = () => {};' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        { projectRoot: cwd, dry: false }
      );

      expect(vol.existsSync(nestedAdmin)).toBe(true);
    });

    test('does nothing when projectRoot option is omitted', () => {
      const rootAdmin = path.join(cwd, 'strapi-admin.js');

      removeStrapiAdminJsTransform(
        { path: rootAdmin, source: 'x' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        {}
      );

      expect(vol.existsSync(rootAdmin)).toBe(true);
    });

    test('passes source through when file is not targeted', () => {
      const out = removeStrapiAdminJsTransform(
        { path: path.join(cwd, 'server', 'index.js'), source: '// server' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        { projectRoot: cwd, dry: false }
      );

      expect(out).toBe('// server');
    });
  });
});
