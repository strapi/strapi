import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ADMIN_VITE_SINGLETON_MODULES } from '../admin-vite-alias-modules';

jest.mock('../resolve-module', () => ({
  getModulePath: jest.fn((mod: string) => `/resolved/admin/${mod}`),
  getModulePathFrom: jest.fn((_host: string, mod: string) => `/resolved/design-system/${mod}`),
}));

// eslint-disable-next-line import/first
import {
  buildSingletonAliasEntries,
  buildAdminViteResolveAliases,
  getResolvableSingletonModules,
  getSubpathEntries,
} from '../admin-vite-aliases';
// eslint-disable-next-line import/first
import { getModulePath, getModulePathFrom } from '../resolve-module';

const getModulePathMock = getModulePath as jest.Mock;
const getModulePathFromMock = getModulePathFrom as jest.Mock;

const PKG_JSON = {
  name: 'fixture-pkg',
  version: '0.0.0',
  exports: {
    '.': './index.js',
    './remapped': './lib/elsewhere.js',
    './split': { import: './esm/split.mjs', require: './cjs/split.js' },
    './env': { browser: './browser/env.js', node: './node/env.js' },
    './node-only': { node: './node/only.js' },
    './blocked': null,
    './wild/*': './wild/*.js',
    './package.json': './package.json',
  },
};

const UNRESOLVABLE_SINGLETON = '@codemirror/lint';

describe('buildSingletonAliasEntries (tolerant CodeMirror resolution)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getModulePathFromMock.mockImplementation((_host: string, mod: string) => {
      if (mod === UNRESOLVABLE_SINGLETON) {
        throw new Error(`Cannot find module '${mod}'`);
      }
      return `/resolved/design-system/${mod}`;
    });
  });

  it('skips an unresolvable singleton instead of throwing', () => {
    expect(() => buildSingletonAliasEntries()).not.toThrow();

    const entries = buildSingletonAliasEntries();
    const aliased = entries.map(([mod]) => mod);

    expect(aliased).not.toContain(UNRESOLVABLE_SINGLETON);

    for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
      if (mod !== UNRESOLVABLE_SINGLETON) {
        expect(aliased).toContain(mod);
      }
    }
  });

  it('never lets an unresolvable singleton crash buildAdminViteResolveAliases', () => {
    expect(() => buildAdminViteResolveAliases()).not.toThrow();

    const alias = buildAdminViteResolveAliases();
    expect(alias).not.toHaveProperty(UNRESOLVABLE_SINGLETON);
    expect(alias['@codemirror/state']).toBe('/resolved/design-system/@codemirror/state');
  });

  it('keeps optimizeDeps.include in lockstep with the aliased singletons', () => {
    const resolvable = getResolvableSingletonModules();

    // An unresolvable singleton must be dropped from include, not forced into pre-bundling.
    expect(resolvable).not.toContain(UNRESOLVABLE_SINGLETON);

    // include mirrors exactly what resolve.alias aliased.
    expect(resolvable).toEqual(buildSingletonAliasEntries().map(([mod]) => mod));
  });
});

describe('getSubpathEntries (tolerant package.json reads)', () => {
  let pkgRoot: string;
  let nullPkgRoot: string;

  beforeAll(() => {
    pkgRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exports-map-'));
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify(PKG_JSON));
    nullPkgRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exports-map-null-'));
    fs.writeFileSync(path.join(nullPkgRoot, 'package.json'), 'null');
    getModulePathMock.mockImplementation((mod: string) => {
      if (mod === 'fixture-pkg') {
        return pkgRoot;
      }
      if (mod === 'null-pkg') {
        return nullPkgRoot;
      }
      return `/resolved/admin/${mod}`;
    });
  });

  afterAll(() => {
    fs.rmSync(pkgRoot, { recursive: true, force: true });
    fs.rmSync(nullPkgRoot, { recursive: true, force: true });
    getModulePathMock.mockImplementation((mod: string) => `/resolved/admin/${mod}`);
  });

  it('returns no keys for a module whose package.json cannot be read', () => {
    // getModulePath is mocked to a path that does not exist
    expect(getSubpathEntries('react-dom')).toEqual([]);
  });

  it('returns no keys for a package.json that holds null', () => {
    expect(getSubpathEntries('null-pkg')).toEqual([]);
  });

  it('keys the subpaths of an exports map a browser build can import', () => {
    expect(getSubpathEntries('fixture-pkg')).toEqual([
      ['fixture-pkg/remapped', path.join(pkgRoot, 'lib/elsewhere.js')],
      ['fixture-pkg/split', path.join(pkgRoot, 'esm/split.mjs')],
      ['fixture-pkg/env', path.join(pkgRoot, 'browser/env.js')],
    ]);
  });
});
