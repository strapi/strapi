import { describe, expect, it } from 'vitest';

import type { Scope } from '../../types';
import {
  formatPnpmWorkspaceYaml,
  getPnpmAllowBuilds,
  getPnpmBuildPackageNames,
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
    expect(getPnpmBuildPackageNames(scope('sqlite'), '22.14.0')).toEqual([
      '@swc/core',
      'core-js-pure',
      'esbuild',
      'sharp',
    ]);
    expect(getPnpmBuildPackageNames(scope('sqlite'), '23.5.0')).toContain('better-sqlite3');
    expect(getPnpmAllowBuilds(scope('sqlite'), '23.6.0')['better-sqlite3']).toBe(false);
    expect(getPnpmAllowBuilds(scope('sqlite'), '24.0.0')['better-sqlite3']).toBe(false);
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

  it('writes allowBuilds for the given Node into the workspace file', () => {
    const yaml12 = formatPnpmWorkspaceYaml(scope('sqlite'), '10.26.0', '22.13.0');
    const yaml13 = formatPnpmWorkspaceYaml(scope('sqlite'), '11.0.0', '24.0.0');

    expect(yaml12).toContain('better-sqlite3: true');
    expect(yaml12).not.toContain('minimumReleaseAgeExclude');
    expect(yaml13).toContain('better-sqlite3: false');
    expect(yaml13).toContain('minimumReleaseAgeExclude');
    expect(formatPnpmWorkspaceYaml(scope('mysql'), null)).toContain('allowBuilds:');
  });
});
