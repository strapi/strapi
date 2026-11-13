import { describe, expect, it } from 'vitest';

import type { Scope } from '../../types';
import {
  formatPnpmWorkspaceYaml,
  getPnpmAllowBuilds,
  getPnpmBuildPackageNames,
  getPnpmIgnoredBuiltDependencies,
  getPnpmOnlyBuiltDependencies,
} from '../pnpm-config';

const scope = (client: Scope['database']['client']): Scope => ({
  name: 'App',
  rootPath: '/tmp/app',
  packageManager: 'pnpm',
  database: { client },
  shouldCreateGrowthSsoTrial: false,
  invocation: 'unknown',
  agentName: null,
});

const byLocale = (left: string, right: string) => left.localeCompare(right);
const linux64 = { platform: 'linux' as const, arch: 'x64' };

describe('pnpm build allow-list', () => {
  it('keeps better-sqlite3 when the 12.x pin still needs its install script', () => {
    expect(getPnpmBuildPackageNames(scope('sqlite'), '22.13.0')).toEqual([
      '@swc/core',
      'better-sqlite3',
      'core-js-pure',
      'esbuild',
      'sharp',
    ]);
    expect(getPnpmAllowBuilds(scope('sqlite'), '22.0.0')).toMatchObject({
      'better-sqlite3': true,
    });
  });

  it('denies the better-sqlite3 13 build so pnpm 11 does not ignore it', () => {
    expect(getPnpmBuildPackageNames(scope('sqlite'), '22.14.0', linux64)).toEqual([
      '@swc/core',
      'core-js-pure',
      'esbuild',
      'sharp',
    ]);
    expect(getPnpmBuildPackageNames(scope('sqlite'), '23.5.0', linux64)).toContain(
      'better-sqlite3'
    );
    expect(getPnpmAllowBuilds(scope('sqlite'), '23.6.0', linux64)['better-sqlite3']).toBe(false);
    expect(getPnpmAllowBuilds(scope('sqlite'), '24.0.0', linux64)['better-sqlite3']).toBe(false);
    expect(
      getPnpmAllowBuilds(scope('sqlite'), '24.0.0', { platform: 'linux', arch: 'arm' })[
        'better-sqlite3'
      ]
    ).toBe(true);
  });

  it('omits better-sqlite3 for postgres and mysql', () => {
    expect(getPnpmBuildPackageNames(scope('postgres'), '22.13.0')).not.toContain('better-sqlite3');
    expect(getPnpmBuildPackageNames(scope('mysql'), '22.14.0')).not.toContain('better-sqlite3');
  });

  it('uses the running Node when no version is passed', () => {
    expect(getPnpmBuildPackageNames(scope('sqlite'))).toEqual(
      getPnpmBuildPackageNames(scope('sqlite'), process.versions.node)
    );
    expect(getPnpmAllowBuilds(scope('postgres'))).toEqual(
      getPnpmAllowBuilds(scope('postgres'), process.versions.node)
    );
  });

  it('merges existing onlyBuiltDependencies in locale order', () => {
    const merged = getPnpmOnlyBuiltDependencies(scope('sqlite'), ['zebra', 'alpha'], '22.13.0');

    expect(merged).toContain('alpha');
    expect(merged).toContain('zebra');
    expect(merged).toContain('better-sqlite3');
    expect(merged).toEqual([...merged].sort(byLocale));
  });

  it('uses the running Node and an empty existing list by default', () => {
    expect(getPnpmOnlyBuiltDependencies(scope('postgres'))).toEqual(
      getPnpmOnlyBuiltDependencies(scope('postgres'), [], process.versions.node)
    );
  });

  it('denies the 13.x build in package.json so pnpm 10 does not offer approve-builds', () => {
    const linux64 = { platform: 'linux' as const, arch: 'x64' };
    const linuxArm = { platform: 'linux' as const, arch: 'arm' };

    expect(getPnpmIgnoredBuiltDependencies(scope('sqlite'), [], '24.0.0', linux64)).toEqual([
      'better-sqlite3',
    ]);
    expect(
      getPnpmOnlyBuiltDependencies(scope('sqlite'), ['better-sqlite3', 'sharp'], '24.0.0', linux64)
    ).not.toContain('better-sqlite3');
    expect(getPnpmIgnoredBuiltDependencies(scope('sqlite'), ['sharp'], '22.13.0', linux64)).toEqual(
      ['sharp']
    );
    expect(getPnpmIgnoredBuiltDependencies(scope('sqlite'), [], '24.0.0', linuxArm)).toEqual([]);
    expect(
      getPnpmIgnoredBuiltDependencies(scope('postgres'), ['sharp'], '24.0.0', linux64)
    ).toEqual(['sharp']);
  });

  it('writes allowBuilds for the given Node into the workspace file', () => {
    const yaml12 = formatPnpmWorkspaceYaml(scope('sqlite'), '10.26.0', '22.13.0', linux64);
    const yaml13 = formatPnpmWorkspaceYaml(scope('sqlite'), '11.0.0', '24.0.0', linux64);

    expect(yaml12).toContain('better-sqlite3: true');
    expect(yaml12).not.toContain('minimumReleaseAgeExclude');
    expect(yaml13).toContain('better-sqlite3: false');
    expect(yaml13).toContain('minimumReleaseAgeExclude');
    expect(formatPnpmWorkspaceYaml(scope('mysql'), null)).toContain('allowBuilds:');
  });
});
