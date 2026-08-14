import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  formatPnpmWorkspaceYaml,
  getPnpmAllowBuilds,
  getPnpmBuildPackageNames,
  shouldUsePackageJsonPnpmConfig,
  shouldUsePnpmWorkspaceConfig,
  writePnpmWorkspaceConfig,
} from '../../../../packages/cli/create-strapi-app/src/utils/pnpm-config';
import type { Scope } from '../../../../packages/cli/create-strapi-app/src/types';

function mkProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-csa-pnpm-config-test-'));
}

function makeScope(rootPath: string, overrides: Partial<Scope> = {}): Scope {
  return {
    name: 'My App',
    rootPath,
    packageManager: 'pnpm',
    database: { client: 'sqlite' },
    shouldCreateGrowthSsoTrial: false,
    uuid: 'test-uuid',
    installId: 'test-install-id',
    ...overrides,
  };
}

describe('pnpm-config', () => {
  it('uses pnpm-workspace.yaml for pnpm 10.26+ and package.json for older pnpm', () => {
    expect(shouldUsePnpmWorkspaceConfig('10.25.9')).toBe(false);
    expect(shouldUsePnpmWorkspaceConfig('10.26.0')).toBe(true);
    expect(shouldUsePnpmWorkspaceConfig('11.8.0')).toBe(true);
    expect(shouldUsePnpmWorkspaceConfig(null)).toBe(true);

    expect(shouldUsePackageJsonPnpmConfig('10.25.9')).toBe(true);
    expect(shouldUsePackageJsonPnpmConfig('10.26.0')).toBe(false);
    expect(shouldUsePackageJsonPnpmConfig('11.8.0')).toBe(false);
    expect(shouldUsePackageJsonPnpmConfig(null)).toBe(false);
  });

  it('includes Strapi native build packages and sqlite only for sqlite projects', () => {
    const sqliteDir = mkProjectDir();
    const postgresDir = mkProjectDir();

    try {
      expect(getPnpmBuildPackageNames(makeScope(sqliteDir))).toEqual([
        '@swc/core',
        'better-sqlite3',
        'core-js-pure',
        'esbuild',
        'sharp',
      ]);
      expect(
        getPnpmBuildPackageNames(makeScope(postgresDir, { database: { client: 'postgres' } }))
      ).toEqual(['@swc/core', 'core-js-pure', 'esbuild', 'sharp']);
    } finally {
      fs.rmSync(sqliteDir, { recursive: true, force: true });
      fs.rmSync(postgresDir, { recursive: true, force: true });
    }
  });

  it('formats pnpm-workspace.yaml with allowBuilds and @strapi release-age exclude on pnpm 11', () => {
    const projectDir = mkProjectDir();

    try {
      const yaml = formatPnpmWorkspaceYaml(makeScope(projectDir), '11.8.0');

      expect(yaml).toContain("packages:\n  - '.'");
      expect(yaml).toContain("minimumReleaseAgeExclude:\n  - '@strapi/*'");
      expect(yaml).toContain("'@swc/core': true");
      expect(yaml).toContain('better-sqlite3: true');
      expect(yaml).toContain('sharp: true');
      expect(getPnpmAllowBuilds(makeScope(projectDir))).toMatchObject({
        '@swc/core': true,
        'better-sqlite3': true,
      });
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('omits minimumReleaseAgeExclude for pnpm 10.26', () => {
    const projectDir = mkProjectDir();

    try {
      const yaml = formatPnpmWorkspaceYaml(makeScope(projectDir), '10.26.0');

      expect(yaml).not.toContain('minimumReleaseAgeExclude');
      expect(yaml).toContain('allowBuilds:');
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('writes pnpm-workspace.yaml for standalone pnpm projects', async () => {
    const projectDir = mkProjectDir();

    try {
      await writePnpmWorkspaceConfig(makeScope(projectDir), '11.8.0');

      expect(fs.existsSync(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(true);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('does not write pnpm-workspace.yaml inside an existing pnpm workspace', async () => {
    const monorepoDir = mkProjectDir();
    const projectDir = path.join(monorepoDir, 'apps', 'strapi');

    try {
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(monorepoDir, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");

      await writePnpmWorkspaceConfig(makeScope(projectDir), '11.8.0');

      expect(fs.existsSync(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(false);
    } finally {
      fs.rmSync(monorepoDir, { recursive: true, force: true });
    }
  });
});
