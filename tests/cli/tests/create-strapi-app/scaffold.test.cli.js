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

  it('does not write a Yarn config for npm projects', async () => {
    const projectDir = mkProjectDir();
    try {
      await spawnCsa([projectDir, ...baseScaffoldArgs, '--use-npm'])
        .expect('code', 0)
        .end();

      expect(fs.existsSync(path.join(projectDir, '.yarnrc.yml'))).toBe(false);
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
