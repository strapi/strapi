'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const coffee = require('coffee');
const semver = require('semver');

const repoRoot = path.resolve(__dirname, '../../../..');
const bin = path.join(repoRoot, 'packages/cli/create-strapi-app/bin/index.js');

const baseScaffoldArgs = ['--non-interactive', '--skip-cloud', '--no-install', '--no-git-init'];

function spawnCsa(args, env = {}) {
  return coffee.spawn(process.execPath, [bin, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
  });
}

function mkProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-csa-cli-test-'));
}

const SQLITE_13 = '13.0.3';
const SQLITE_12 = '12.11.1';
const ENGINES_WIDE = '>=22.0.0 <=26.x.x';
const ENGINES_13 = '>=22.14.0 <23.0.0 || >=23.6.0 <=26.x.x';

/**
 * 13.0.3 loads only with Node-API 10 and only on the 64-bit linux/darwin/win32 prebuilds.
 * Must stay in step with platformCanLoadBetterSqlite3V13 in create-strapi-app.
 */
function hostCanLoadSqlite13() {
  return (
    Number(process.versions.napi) >= 10 &&
    ['linux', 'darwin', 'win32'].includes(process.platform) &&
    ['x64', 'arm64'].includes(process.arch)
  );
}

function expectedSqlitePin(yarnVersion) {
  const yarnMajor = yarnVersion == null ? null : Number(String(yarnVersion).split('.')[0]);
  const yarnCanInstall13 = yarnMajor === null || yarnMajor >= 2;

  return hostCanLoadSqlite13() && yarnCanInstall13 ? SQLITE_13 : SQLITE_12;
}

function expectSqlitePackageJson(pkg, yarnVersion) {
  const pin = expectedSqlitePin(yarnVersion);

  expect(pkg.dependencies['better-sqlite3']).toBe(pin);
  expect(pkg.engines.node).toBe(pin === SQLITE_13 ? ENGINES_13 : ENGINES_WIDE);

  if (yarnVersion != null && pin === SQLITE_13) {
    expect(pkg.dependenciesMeta).toEqual({ 'better-sqlite3': { built: false } });
  } else {
    expect(pkg.dependenciesMeta).toBeUndefined();
  }
}

/**
 * 12.x still needs its install script. 13.x is denied (`better-sqlite3: false`)
 * wherever this machine can load the 13.0.3 prebuild.
 */
function sqliteDriverNeedsPnpmBuild() {
  return !hostCanLoadSqlite13();
}

function yarnOnPath(version) {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-csa-yarn-bin-'));
  fs.writeFileSync(
    path.join(binDir, 'yarn'),
    `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(`${version}\n`)});\n`
  );
  fs.chmodSync(path.join(binDir, 'yarn'), 0o755);

  return binDir;
}

function sqlitePnpmBuildPackages() {
  const packages = ['@swc/core', 'core-js-pure', 'esbuild', 'sharp'];

  if (sqliteDriverNeedsPnpmBuild()) {
    packages.splice(1, 0, 'better-sqlite3');
  }

  return packages;
}

function expectGeneratedUploadPolicy(pluginsConfig) {
  const allowedMediaTypes = pluginsConfig.match(/const allowedMediaTypes = \[([\s\S]*?)\];/);
  const deniedTypes = pluginsConfig.match(/const deniedTypes = \[([\s\S]*?)\];/);

  expect(allowedMediaTypes?.[1]).toContain("'image/*'");
  expect(deniedTypes?.[1]).toContain("'image/svg+xml'");
  expect(pluginsConfig).toMatch(
    /security:\s*{\s*allowedTypes:\s*allowedMediaTypes,\s*deniedTypes,\s*}/
  );
}

describe('create-strapi-app', () => {
  beforeAll(() => {
    if (!fs.existsSync(bin)) {
      throw new Error(
        `create-strapi-app bin missing at ${bin}; build the package first (yarn workspace create-strapi-app build)`
      );
    }
  });

  it('scaffolds a TypeScript project by default', async () => {
    const projectDir = mkProjectDir();
    try {
      const { stdout } = await spawnCsa([projectDir, ...baseScaffoldArgs])
        .expect('code', 0)
        .end();

      expect(stdout).toContain('Your application was created');
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'config', 'database.ts'))).toBe(true);

      const apiConfig = fs.readFileSync(path.join(projectDir, 'config', 'api.ts'), 'utf8');
      expect(apiConfig).toContain('strictParams: true');

      const serverConfig = fs.readFileSync(path.join(projectDir, 'config', 'server.ts'), 'utf8');
      expect(serverConfig).toContain('populateRelations: env.bool(');

      const pluginsConfig = fs.readFileSync(path.join(projectDir, 'config', 'plugins.ts'), 'utf8');
      expect(pluginsConfig).toContain("jwtManagement: 'refresh'");
      expect(pluginsConfig).toContain('httpOnly: true');
      expect(pluginsConfig).toContain('allowedTypes:');
      expect(pluginsConfig).toContain('application/x-executable');
      expectGeneratedUploadPolicy(pluginsConfig);

      const envFile = fs.readFileSync(path.join(projectDir, '.env'), 'utf8');
      expect(envFile).toMatch(/^JWT_SECRET=.+/m);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('scaffolds a JavaScript project with --javascript', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--javascript'])
        .expect('code', 0)
        .end();

      expect(fs.existsSync(path.join(projectDir, 'config', 'database.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'src', 'index.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(false);

      const pluginsConfig = fs.readFileSync(path.join(projectDir, 'config', 'plugins.js'), 'utf8');
      expectGeneratedUploadPolicy(pluginsConfig);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('scaffolds the example template with --example', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--example'])
        .expect('code', 0)
        .end();

      expect(fs.existsSync(path.join(projectDir, 'data', 'data.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);

      const pluginsConfig = fs.readFileSync(path.join(projectDir, 'config', 'plugins.ts'), 'utf8');
      expectGeneratedUploadPolicy(pluginsConfig);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('scaffolds the JavaScript example template with --example --javascript', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--example', '--javascript'])
        .expect('code', 0)
        .end();

      expect(fs.existsSync(path.join(projectDir, 'data', 'data.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, 'config', 'plugins.js'))).toBe(true);

      const pluginsConfig = fs.readFileSync(path.join(projectDir, 'config', 'plugins.js'), 'utf8');
      expectGeneratedUploadPolicy(pluginsConfig);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('writes a Yarn node-modules linker config for Yarn projects', async () => {
    const projectDir = mkProjectDir();
    const yarnBin = yarnOnPath('4.12.0');
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-yarn'], {
        // The user agent says Yarn 1. The binary in the app directory is Yarn 4, and that one wins.
        npm_config_user_agent: 'yarn/1.22.22 npm/? node/v24.12.0 darwin arm64',
        PATH: `${yarnBin}${path.delimiter}${process.env.PATH}`,
      })
        .expect('code', 0)
        .end();

      expect(fs.readFileSync(path.join(projectDir, '.yarnrc.yml'), 'utf8')).toBe(
        'nodeLinker: node-modules\n'
      );
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
      expectSqlitePackageJson(pkg, '4.12.0');
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
      fs.rmSync(yarnBin, { recursive: true, force: true });
    }
  });

  it('does not write a Yarn config for Yarn classic projects', async () => {
    const projectDir = mkProjectDir();
    const yarnBin = yarnOnPath('1.22.22');
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-yarn'], {
        // A parent Yarn 4 user agent must not pin 13 when the app directory's yarn is classic.
        npm_config_user_agent: 'yarn/4.12.0 npm/? node/v24.12.0 darwin arm64',
        PATH: `${yarnBin}${path.delimiter}${process.env.PATH}`,
      })
        .expect('code', 0)
        .end();

      expect(fs.existsSync(path.join(projectDir, '.yarnrc.yml'))).toBe(false);
      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
      expectSqlitePackageJson(pkg, '1.22.22');
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
      fs.rmSync(yarnBin, { recursive: true, force: true });
    }
  });

  it('does not write a Yarn config or .npmrc for npm projects', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-npm'])
        .expect('code', 0)
        .end();

      expect(fs.existsSync(path.join(projectDir, '.yarnrc.yml'))).toBe(false);
      // npm install must use default peer resolution so the lockfile works with
      // plain `npm ci` (#27019) — do not force legacy-peer-deps via .npmrc
      expect(fs.existsSync(path.join(projectDir, '.npmrc'))).toBe(false);

      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
      // Templates import @strapi/database directly; must be a direct dep for pnpm (#26949)
      expect(pkg.dependencies['@strapi/database']).toBe(pkg.dependencies['@strapi/strapi']);
      // Align with @strapi/* peer ranges so strict npm peer resolution succeeds
      expect(pkg.dependencies['react-router-dom']).toBe('^6.30.3');
      expect(pkg.dependencies.react).toBe('^18.0.0');
      expect(pkg.dependencies['react-dom']).toBe('^18.0.0');
      expect(pkg.dependencies['styled-components']).toBe('^6.0.0');
      expectSqlitePackageJson(pkg, null);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('scaffolds pnpm-workspace.yaml allowBuilds for SQLite projects on pnpm 11', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-pnpm'], {
        npm_config_user_agent: 'pnpm/11.8.0 npm/? node/v24.12.0 darwin arm64',
      })
        .expect('code', 0)
        .end();

      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
      const workspace = fs.readFileSync(path.join(projectDir, 'pnpm-workspace.yaml'), 'utf8');

      expectSqlitePackageJson(pkg, null);
      expect(pkg.pnpm).toBeUndefined();
      expect(workspace).toContain('allowBuilds:');
      expect(workspace).toContain('sharp: true');
      expect(workspace).toContain("'@swc/core': true");
      if (sqliteDriverNeedsPnpmBuild()) {
        expect(workspace).toContain('better-sqlite3: true');
      } else {
        expect(workspace).toContain('better-sqlite3: false');
      }
      expect(workspace).toContain("minimumReleaseAgeExclude:\n  - '@strapi/*'");
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('writes package.json onlyBuiltDependencies for pnpm 10', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-pnpm'], {
        npm_config_user_agent: 'pnpm/10.25.0 npm/? node/v24.12.0 darwin arm64',
      })
        .expect('code', 0)
        .end();

      const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));

      expectSqlitePackageJson(pkg, null);
      expect(pkg.pnpm.onlyBuiltDependencies).toEqual(sqlitePnpmBuildPackages());
      if (expectedSqlitePin(null) === SQLITE_13) {
        expect(pkg.pnpm.ignoredBuiltDependencies).toEqual(['better-sqlite3']);
        expect(pkg.pnpm.onlyBuiltDependencies).not.toContain('better-sqlite3');
      } else {
        expect(pkg.pnpm.ignoredBuiltDependencies).toBeUndefined();
      }
      expect(fs.existsSync(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(false);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('scaffolds inside an existing Yarn workspace monorepo', async () => {
    const monorepoDir = mkProjectDir();
    const projectDir = path.join(monorepoDir, 'packages', 'strapi-app');
    const yarnBin = yarnOnPath('4.12.0');

    try {
      fs.mkdirSync(path.dirname(projectDir), { recursive: true });
      fs.writeFileSync(
        path.join(monorepoDir, 'package.json'),
        JSON.stringify(
          {
            private: true,
            packageManager: 'yarn@4.12.0',
            workspaces: ['packages/*'],
          },
          null,
          2
        )
      );
      fs.writeFileSync(path.join(monorepoDir, '.yarnrc.yml'), 'nodeLinker: pnp\n');

      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-yarn'], {
        npm_config_user_agent: 'yarn/4.12.0 npm/? node/v24.12.0 darwin arm64',
        PATH: `${yarnBin}${path.delimiter}${process.env.PATH}`,
      })
        .expect('code', 0)
        .end();

      expect(fs.readFileSync(path.join(projectDir, '.yarnrc.yml'), 'utf8')).toBe(
        'nodeLinker: node-modules\n'
      );
      expect(fs.readFileSync(path.join(monorepoDir, '.yarnrc.yml'), 'utf8')).toBe(
        'nodeLinker: pnp\n'
      );
    } finally {
      fs.rmSync(monorepoDir, { recursive: true, force: true });
      fs.rmSync(yarnBin, { recursive: true, force: true });
    }
  });

  it('fails when --non-interactive is used without a directory', async () => {
    const { stderr, stdout } = await spawnCsa(['--non-interactive', '--skip-cloud'])
      .expect('code', 1)
      .end();

    const out = `${stdout}${stderr}`;
    expect(out).toMatch(/non-interactive|directory/i);
  });

  it('fails when --typescript and --javascript are both set', async () => {
    const projectDir = mkProjectDir();
    try {
      const { stderr, stdout } = await spawnCsa([
        projectDir,
        ...baseScaffoldArgs,
        '--typescript',
        '--javascript',
      ])
        .expect('code', 1)
        .end();

      const out = `${stdout}${stderr}`;
      expect(out).toMatch(/cannot use both|typescript.*javascript/i);
    } finally {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
    }
  });

  it('fails when multiple package manager flags are used', async () => {
    const projectDir = mkProjectDir();
    try {
      const { stderr, stdout } = await spawnCsa([
        projectDir,
        ...baseScaffoldArgs,
        '--use-npm',
        '--use-yarn',
      ])
        .expect('code', 1)
        .end();

      const out = `${stdout}${stderr}`;
      expect(out).toMatch(/package manager|use-npm|use-yarn/i);
    } finally {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
    }
  });

  it('prints a semver version with --version', async () => {
    const { stdout } = await spawnCsa(['--version']).expect('code', 0).end();

    const v = stdout.trim();
    expect(semver.valid(v)).toBeTruthy();
  });
});
