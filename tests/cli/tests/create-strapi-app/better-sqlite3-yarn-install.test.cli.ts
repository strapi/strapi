import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

jest.mock('sort-package-json', () => ({
  sortPackageJson: (pkg: Record<string, unknown>) => pkg,
}));

import { BETTER_SQLITE3_VERSION } from '../../../../packages/cli/create-strapi-app/src/utils/database';
import { SQLITE_13_NODE_ENGINE } from '../../../../packages/cli/create-strapi-app/src/utils/engines';
import { createPackageJSON } from '../../../../packages/cli/create-strapi-app/src/utils/package-json';
import type { Scope } from '../../../../packages/cli/create-strapi-app/src/types';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const YARN_CLI = path.join(REPO_ROOT, '.yarn/releases/yarn-4.12.0.cjs');

/**
 * Yarn 4.12 runs node-gyp for better-sqlite3 13 unless dependenciesMeta says not to.
 * createPackageJSON writes this field for a Yarn SQLite app on Node >= 22.14
 * (see sqlite-driver.vitest.test.ts). The prebuild is Node-API 10, so the install
 * only runs where that binary can load.
 */
const nodeCanLoadSqlite13 = Number(process.versions.napi) >= 10;
const installTest = nodeCanLoadSqlite13 ? it : it.skip;

installTest(
  'a Yarn SQLite app installs better-sqlite3 13 without compiling it',
  async () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-sqlite-yarn-install-'));

    fs.writeFileSync(path.join(rootPath, '.yarnrc.yml'), 'nodeLinker: node-modules\n');

    const scope: Scope = {
      name: 'Yarn Sqlite',
      rootPath,
      packageManager: 'yarn',
      database: { client: 'sqlite' },
      dependencies: { 'better-sqlite3': BETTER_SQLITE3_VERSION },
      shouldCreateGrowthSsoTrial: false,
      invocation: 'unknown',
      agentName: null,
      uuid: 'test-uuid',
      installId: 'test-install-id',
    };

    await createPackageJSON(scope);

    const pkg = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));
    expect(pkg.dependencies['better-sqlite3']).toBe(BETTER_SQLITE3_VERSION);
    expect(pkg.dependenciesMeta).toEqual({ 'better-sqlite3': { built: false } });
    expect(pkg.engines.node).toBe(SQLITE_13_NODE_ENGINE);

    try {
      const install = spawnSync(process.execPath, [YARN_CLI, 'install'], {
        cwd: rootPath,
        encoding: 'utf8',
        timeout: 120000,
        env: {
          ...process.env,
          YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
        },
      });

      const output = `${install.stdout}\n${install.stderr}`;
      expect(install.status).toBe(0);
      expect(output).toContain('build has been explicitly disabled');

      const loaded = spawnSync(
        process.execPath,
        [
          '-e',
          "const db = require('better-sqlite3')(':memory:'); if (db.prepare('select 1 as n').get().n !== 1) process.exit(1);",
        ],
        { cwd: rootPath, encoding: 'utf8', timeout: 30000 }
      );

      expect(loaded.status).toBe(0);
    } finally {
      fs.rmSync(rootPath, { recursive: true, force: true });
    }
  },
  150000
);
