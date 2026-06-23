/* eslint-disable @typescript-eslint/no-var-requires, node/no-missing-require */
import path from 'node:path';
import readPkgUp from 'read-pkg-up';

import { ADMIN_PINNED_ALIAS_MODULES, ADMIN_VITE_ALIAS_MODULES } from '../admin-vite-alias-modules';

const actualResolveFrom = jest.requireActual<typeof import('resolve-from')>('resolve-from');
const adminPkgDir = path.dirname(require.resolve('@strapi/admin/package.json'));
const adminDeps = require('@strapi/admin/package.json').dependencies as Record<string, string>;

const loadGetModulePath = (
  resolveImpl: (from: string, mod: string) => string = actualResolveFrom
) => {
  jest.resetModules();
  const resolveFromMock = jest.fn(resolveImpl);
  jest.doMock('resolve-from', () => resolveFromMock);
  const getModulePath = require('../resolve-module').getModulePath as (mod: string) => string;

  return { getModulePath, resolveFromMock };
};

describe('getModulePath', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('resolve-from');
    jest.dontMock('read-pkg-up');
  });

  it.each(ADMIN_VITE_ALIAS_MODULES)('resolves %s from @strapi/admin dependency context', (mod) => {
    const { getModulePath, resolveFromMock } = loadGetModulePath();

    getModulePath(mod);

    expect(resolveFromMock).toHaveBeenCalledWith(adminPkgDir, mod);
  });

  it.each(ADMIN_PINNED_ALIAS_MODULES)(
    'resolves %s to the version pinned by @strapi/admin',
    (mod) => {
      const { getModulePath } = loadGetModulePath();
      const pkgRoot = getModulePath(mod);
      const pkg = readPkgUp.sync({ cwd: pkgRoot });

      expect(pkg?.packageJson?.version).toBe(adminDeps[mod]);
    }
  );

  it('prefers @strapi/admin closure over a hoisted incompatible major (pnpm monorepo)', () => {
    const adminRtkEntry =
      '/tmp/pnpm-store/@reduxjs+toolkit@1.9.7/node_modules/@reduxjs/toolkit/dist/index.js';
    const adminRtkRoot = path.dirname(path.dirname(adminRtkEntry));

    jest.resetModules();
    const resolveFromMock = jest.fn((from: string, mod: string) => {
      if (from === adminPkgDir && mod === '@reduxjs/toolkit') {
        return adminRtkEntry;
      }

      return actualResolveFrom(from, mod);
    });
    const readPkgUpMock = jest.fn(() => ({
      path: path.join(adminRtkRoot, 'package.json'),
      packageJson: { name: '@reduxjs/toolkit', version: '1.9.7' },
    }));

    jest.doMock('resolve-from', () => resolveFromMock);
    jest.doMock('read-pkg-up', () => ({ sync: readPkgUpMock }));

    const getModulePath = require('../resolve-module').getModulePath as (mod: string) => string;

    expect(getModulePath('@reduxjs/toolkit')).toBe(adminRtkRoot);
    expect(resolveFromMock).toHaveBeenCalledWith(adminPkgDir, '@reduxjs/toolkit');
  });
});
