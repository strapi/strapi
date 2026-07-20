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
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('writes a Yarn node-modules linker config for Yarn projects', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-yarn'], {
        npm_config_user_agent: 'yarn/4.12.0 npm/? node/v24.12.0 darwin arm64',
      })
        .expect('code', 0)
        .end();

      expect(fs.readFileSync(path.join(projectDir, '.yarnrc.yml'), 'utf8')).toBe(
        'nodeLinker: node-modules\n'
      );
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('does not write a Yarn config for Yarn classic projects', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-yarn'], {
        npm_config_user_agent: 'yarn/1.22.22 npm/? node/v24.12.0 darwin arm64',
      })
        .expect('code', 0)
        .end();

      expect(fs.existsSync(path.join(projectDir, '.yarnrc.yml'))).toBe(false);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
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
      // Align with @strapi/* peer ranges so strict npm peer resolution succeeds
      expect(pkg.dependencies['react-router-dom']).toBe('^6.30.3');
      expect(pkg.dependencies.react).toBe('^18.0.0');
      expect(pkg.dependencies['react-dom']).toBe('^18.0.0');
      expect(pkg.dependencies['styled-components']).toBe('^6.0.0');
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

      expect(pkg.dependencies).toMatchObject({ 'better-sqlite3': expect.any(String) });
      expect(pkg.pnpm).toBeUndefined();
      expect(workspace).toContain('allowBuilds:');
      expect(workspace).toContain('better-sqlite3: true');
      expect(workspace).toContain('sharp: true');
      expect(workspace).toContain("'@swc/core': true");
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

      expect(pkg.pnpm.onlyBuiltDependencies).toEqual(
        expect.arrayContaining(['@swc/core', 'better-sqlite3', 'esbuild', 'sharp'])
      );
      expect(fs.existsSync(path.join(projectDir, 'pnpm-workspace.yaml'))).toBe(false);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('scaffolds inside an existing Yarn workspace monorepo', async () => {
    const monorepoDir = mkProjectDir();
    const projectDir = path.join(monorepoDir, 'packages', 'strapi-app');

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
