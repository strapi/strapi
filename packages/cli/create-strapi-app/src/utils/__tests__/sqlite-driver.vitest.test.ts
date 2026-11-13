import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { Scope } from '../../types';
import {
  BETTER_SQLITE3_NODE_22_13_VERSION,
  BETTER_SQLITE3_VERSION,
  getBetterSqlite3Version,
} from '../database';
import { engines, SQLITE_13_NODE_ENGINE } from '../engines';
import { createPackageJSON } from '../package-json';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const scope = (rootPath: string, overrides: Partial<Scope> = {}): Scope => ({
  name: 'Sqlite App',
  rootPath,
  packageManager: 'yarn',
  database: { client: 'sqlite' },
  dependencies: { 'better-sqlite3': BETTER_SQLITE3_VERSION },
  shouldCreateGrowthSsoTrial: false,
  invocation: 'unknown',
  agentName: null,
  uuid: 'test-uuid',
  installId: 'test-install-id',
  ...overrides,
});

describe('better-sqlite3 version for the running Node', () => {
  it('pins 12.11.1 where Node-API 10 is missing', () => {
    expect(getBetterSqlite3Version('22.0.0')).toBe(BETTER_SQLITE3_NODE_22_13_VERSION);
    expect(getBetterSqlite3Version('22.13.0')).toBe(BETTER_SQLITE3_NODE_22_13_VERSION);
    expect(getBetterSqlite3Version('23.5.0')).toBe(BETTER_SQLITE3_NODE_22_13_VERSION);
  });

  it('pins 13.0.3 where Node-API 10 is available', () => {
    const linux64 = { platform: 'linux' as const, arch: 'x64' };

    expect(getBetterSqlite3Version('22.14.0', null, linux64)).toBe(BETTER_SQLITE3_VERSION);
    expect(getBetterSqlite3Version('23.6.0', null, linux64)).toBe(BETTER_SQLITE3_VERSION);
    expect(getBetterSqlite3Version('24.11.0', null, linux64)).toBe(BETTER_SQLITE3_VERSION);
    expect(getBetterSqlite3Version('26.0.0', null, linux64)).toBe(BETTER_SQLITE3_VERSION);
  });

  it('pins 12.11.1 for Yarn 1, which compiles 13.x', () => {
    const linux64 = { platform: 'linux' as const, arch: 'x64' };

    expect(getBetterSqlite3Version('24.11.0', '1.22.22', linux64)).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(getBetterSqlite3Version('22.14.0', '1.22.22', linux64)).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
  });

  it('pins 13.0.3 for Yarn 2 and later when Node can load it', () => {
    const linux64 = { platform: 'linux' as const, arch: 'x64' };

    expect(getBetterSqlite3Version('24.11.0', '2.4.3', linux64)).toBe(BETTER_SQLITE3_VERSION);
    expect(getBetterSqlite3Version('24.11.0', '4.12.0', linux64)).toBe(BETTER_SQLITE3_VERSION);
    expect(getBetterSqlite3Version('22.13.0', '4.12.0', linux64)).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
  });

  it('pins 13.0.3 only on the 64-bit platforms that ship a prebuild', () => {
    const supported = { platform: 'linux' as const, arch: 'x64' };

    expect(getBetterSqlite3Version('24.11.0', null, supported)).toBe(BETTER_SQLITE3_VERSION);
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'linux', arch: 'arm64' })).toBe(
      BETTER_SQLITE3_VERSION
    );
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'darwin', arch: 'arm64' })).toBe(
      BETTER_SQLITE3_VERSION
    );
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'win32', arch: 'x64' })).toBe(
      BETTER_SQLITE3_VERSION
    );
  });

  it('pins 12.11.1 where 13.0.3 has no prebuild, including 32-bit ARM', () => {
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'linux', arch: 'arm' })).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(getBetterSqlite3Version('22.14.0', '4.12.0', { platform: 'linux', arch: 'arm' })).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'linux', arch: 'ia32' })).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'linux', arch: 'riscv64' })).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'win32', arch: 'ia32' })).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(getBetterSqlite3Version('24.11.0', null, { platform: 'freebsd', arch: 'x64' })).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
    expect(getBetterSqlite3Version('22.13.0', null, { platform: 'linux', arch: 'x64' })).toBe(
      BETTER_SQLITE3_NODE_22_13_VERSION
    );
  });
});

describe('createPackageJSON yarn sqlite install', () => {
  it('tells Yarn not to compile better-sqlite3 13', async () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-sqlite-yarn-'));
    dirs.push(rootPath);

    await createPackageJSON(scope(rootPath));

    const pkg = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));

    expect(pkg.dependenciesMeta).toStrictEqual({ 'better-sqlite3': { built: false } });
    expect(pkg.engines.node).toBe(SQLITE_13_NODE_ENGINE);
  });

  it('leaves the install script enabled for the 12.x pin and for npm', async () => {
    const yarn12 = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-sqlite-yarn12-'));
    const npm13 = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-sqlite-npm-'));
    dirs.push(yarn12, npm13);

    await createPackageJSON(
      scope(yarn12, { dependencies: { 'better-sqlite3': BETTER_SQLITE3_NODE_22_13_VERSION } })
    );
    await createPackageJSON(
      scope(npm13, {
        packageManager: 'npm',
        dependencies: { 'better-sqlite3': BETTER_SQLITE3_VERSION },
      })
    );

    const yarnPkg = JSON.parse(fs.readFileSync(path.join(yarn12, 'package.json'), 'utf8'));
    const npmPkg = JSON.parse(fs.readFileSync(path.join(npm13, 'package.json'), 'utf8'));

    expect(yarnPkg.dependenciesMeta).toBeUndefined();
    expect(yarnPkg.engines.node).toBe(engines.node);
    expect(npmPkg.dependenciesMeta).toBeUndefined();
    expect(npmPkg.engines.node).toBe(SQLITE_13_NODE_ENGINE);
  });
});
