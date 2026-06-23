import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

jest.mock('sort-package-json', () => ({
  sortPackageJson: (pkg: Record<string, unknown>) => pkg,
}));

import { createPackageJSON } from '../../../../packages/cli/create-strapi-app/src/utils/package-json';
import type { Scope } from '../../../../packages/cli/create-strapi-app/src/types';

const repoRoot = path.resolve(__dirname, '../../../..');

function mkProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-csa-pkg-json-test-'));
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
    dependencies: {
      'better-sqlite3': '11.0.0',
    },
    ...overrides,
  };
}

function readPkg(rootPath: string) {
  return JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));
}

describe('createPackageJSON', () => {
  beforeAll(() => {
    const pkgJsonPath = path.join(repoRoot, 'packages/cli/create-strapi-app/package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      throw new Error(`create-strapi-app package missing at ${pkgJsonPath}`);
    }
  });

  it('replaces onlyBuiltDependencies instead of merging arrays by index', async () => {
    const projectDir = mkProjectDir();

    try {
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({
          scripts: { develop: 'strapi develop' },
          pnpm: {
            onlyBuiltDependencies: ['esbuild', 'esbuild', 'sharp', 'esbuild'],
          },
        })
      );

      await createPackageJSON(makeScope(projectDir));

      expect(readPkg(projectDir).pnpm.onlyBuiltDependencies).toEqual([
        'better-sqlite3',
        'esbuild',
        'sharp',
      ]);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('filters non-string onlyBuiltDependencies entries from existing package.json', async () => {
    const projectDir = mkProjectDir();

    try {
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({
          scripts: { develop: 'strapi develop' },
          pnpm: {
            onlyBuiltDependencies: ['esbuild', null, {}, 'sharp'],
          },
        })
      );

      await createPackageJSON(makeScope(projectDir));

      expect(readPkg(projectDir).pnpm.onlyBuiltDependencies).toEqual([
        'better-sqlite3',
        'esbuild',
        'sharp',
      ]);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('preserves template dependencies when merging package.json', async () => {
    const projectDir = mkProjectDir();

    try {
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({
          scripts: { develop: 'strapi develop', 'seed:example': 'node ./scripts/seed.js' },
          dependencies: {
            'fs-extra': '^10.0.0',
            'mime-types': '^2.1.27',
          },
        })
      );

      await createPackageJSON(
        makeScope(projectDir, {
          dependencies: {
            '@strapi/strapi': '5.48.0',
            'better-sqlite3': '11.0.0',
          },
        })
      );

      const pkg = readPkg(projectDir);

      expect(pkg.dependencies).toMatchObject({
        'fs-extra': '^10.0.0',
        'mime-types': '^2.1.27',
        '@strapi/strapi': '5.48.0',
        'better-sqlite3': '11.0.0',
      });
      expect(pkg.scripts).toMatchObject({ 'seed:example': 'node ./scripts/seed.js' });
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('does not add pnpm config for non-pnpm package managers', async () => {
    const projectDir = mkProjectDir();

    try {
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({ scripts: { develop: 'strapi develop' } })
      );

      await createPackageJSON(makeScope(projectDir, { packageManager: 'npm' }));

      expect(readPkg(projectDir).pnpm).toBeUndefined();
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
