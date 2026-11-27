import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createStrapiAppBin } from '@strapi/tests-shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { run, type RunOptions, type RunResult } from '../helpers';

const bin = createStrapiAppBin();

const baseScaffoldArgs = ['--non-interactive', '--no-install', '--no-git-init'];

/**
 * Every flag that would otherwise open a prompt, so a run without --non-interactive completes
 * only if no other prompt (such as the removed Strapi Cloud login) is asked. The child process
 * has no terminal, so `--interactive` keeps the prompts on: without it the CLI switches to
 * non-interactive mode and an unanswered prompt would go unnoticed.
 */
const promptFreeArgs = [
  '--interactive',
  '--typescript',
  '--no-example',
  '--skip-db',
  '--no-install',
  '--no-git-init',
];

const cloudPromptPattern = /log in|sign up|strapi cloud|strapi servers|trial/i;

const yarnBerry = { npm_config_user_agent: 'yarn/4.12.0 npm/? node/v24.12.0 darwin arm64' };

const tempDirs: string[] = [];

/** Outside the repo, so the CLI doesn't see the monorepo's Yarn workspace. */
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-csa-cli-test-'));
  tempDirs.push(dir);
  return dir;
};

const csa = (args: string[], options: RunOptions = {}) =>
  run(bin, args, { cwd: os.tmpdir(), ...options });

const expectExitCode = (result: RunResult, code: number) => {
  expect(result.code, result.output).toBe(code);
};

const read = (...segments: string[]) => fs.readFileSync(path.join(...segments), 'utf8');

const readJson = (...segments: string[]) => JSON.parse(read(...segments));

const exists = (...segments: string[]) => fs.existsSync(path.join(...segments));

const expectGeneratedUploadPolicy = (pluginsConfig: string) => {
  const allowedMediaTypes = pluginsConfig.match(/const allowedMediaTypes = \[([\s\S]*?)\];/);
  const deniedTypes = pluginsConfig.match(/const deniedTypes = \[([\s\S]*?)\];/);

  expect(allowedMediaTypes?.[1]).toContain("'image/*'");
  expect(deniedTypes?.[1]).toContain("'image/svg+xml'");
  expect(pluginsConfig).toMatch(
    /security:\s*{\s*allowedTypes:\s*allowedMediaTypes,\s*deniedTypes,\s*}/
  );
};

// Every test writes to its own temp dir.
describe.concurrent('create-strapi-app', () => {
  beforeAll(() => {
    if (!fs.existsSync(path.join(path.dirname(bin), '..', 'dist'))) {
      throw new Error('create-strapi-app is not built: run `yarn nx build create-strapi-app`.');
    }
  });

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('scaffolds a TypeScript project by default', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs]);

    expectExitCode(result, 0);
    expect(result.stdout).toContain('Your application was created');
    expect(exists(projectDir, 'package.json')).toBe(true);
    expect(exists(projectDir, 'tsconfig.json')).toBe(true);
    expect(exists(projectDir, 'config', 'database.ts')).toBe(true);

    expect(read(projectDir, 'config', 'api.ts')).toContain('strictParams: true');
    expect(read(projectDir, 'config', 'server.ts')).toContain('populateRelations: env.bool(');

    const pluginsConfig = read(projectDir, 'config', 'plugins.ts');
    expect(pluginsConfig).toContain("jwtManagement: 'refresh'");
    expect(pluginsConfig).toContain('httpOnly: true');
    expect(pluginsConfig).toContain('allowedTypes:');
    expect(pluginsConfig).toContain('application/x-executable');
    expectGeneratedUploadPolicy(pluginsConfig);

    expect(read(projectDir, '.env')).toMatch(/^JWT_SECRET=.+/m);
  });

  it('scaffolds a JavaScript project with --javascript', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--javascript']);

    expectExitCode(result, 0);
    expect(exists(projectDir, 'config', 'database.js')).toBe(true);
    expect(exists(projectDir, 'src', 'index.js')).toBe(true);
    expect(exists(projectDir, 'tsconfig.json')).toBe(false);
    expectGeneratedUploadPolicy(read(projectDir, 'config', 'plugins.js'));
  });

  it('scaffolds the example template with --example', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--example']);

    expectExitCode(result, 0);
    expect(exists(projectDir, 'data', 'data.json')).toBe(true);
    expect(exists(projectDir, 'package.json')).toBe(true);
    expectGeneratedUploadPolicy(read(projectDir, 'config', 'plugins.ts'));
  });

  it('scaffolds the JavaScript example template with --example --javascript', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--example', '--javascript']);

    expectExitCode(result, 0);
    expect(exists(projectDir, 'data', 'data.json')).toBe(true);
    expect(exists(projectDir, 'config', 'plugins.js')).toBe(true);
    expectGeneratedUploadPolicy(read(projectDir, 'config', 'plugins.js'));
  });

  it('writes a Yarn node-modules linker config for Yarn projects', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--use-yarn'], { env: yarnBerry });

    expectExitCode(result, 0);
    expect(read(projectDir, '.yarnrc.yml')).toBe('nodeLinker: node-modules\n');
  });

  it('does not write a Yarn config for Yarn classic projects', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--use-yarn'], {
      env: { npm_config_user_agent: 'yarn/1.22.22 npm/? node/v24.12.0 darwin arm64' },
    });

    expectExitCode(result, 0);
    expect(exists(projectDir, '.yarnrc.yml')).toBe(false);
  });

  it('does not write a Yarn config or .npmrc for npm projects', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--use-npm']);

    expectExitCode(result, 0);
    expect(exists(projectDir, '.yarnrc.yml')).toBe(false);
    // npm install must use the default peer resolution, so that the lockfile works with a plain
    // `npm ci` (#27019): no legacy-peer-deps through .npmrc.
    expect(exists(projectDir, '.npmrc')).toBe(false);

    const pkg = readJson(projectDir, 'package.json');
    // The templates import @strapi/database directly: pnpm needs it as a direct dependency (#26949).
    expect(pkg.dependencies['@strapi/database']).toBe(pkg.dependencies['@strapi/strapi']);
    // Same ranges as the @strapi/* peer dependencies, so a strict npm peer resolution succeeds.
    expect(pkg.dependencies['react-router-dom']).toBe('^6.30.3');
    expect(pkg.dependencies.react).toBe('^18.0.0');
    expect(pkg.dependencies['react-dom']).toBe('^18.0.0');
    expect(pkg.dependencies['styled-components']).toBe('^6.0.0');
  });

  it('scaffolds pnpm-workspace.yaml allowBuilds for SQLite projects on pnpm 11', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--use-pnpm'], {
      env: { npm_config_user_agent: 'pnpm/11.8.0 npm/? node/v24.12.0 darwin arm64' },
    });

    expectExitCode(result, 0);
    const pkg = readJson(projectDir, 'package.json');
    expect(pkg.dependencies).toMatchObject({ 'better-sqlite3': expect.any(String) });
    expect(pkg.pnpm).toBeUndefined();

    const workspace = read(projectDir, 'pnpm-workspace.yaml');
    expect(workspace).toContain('allowBuilds:');
    expect(workspace).toContain('better-sqlite3: true');
    expect(workspace).toContain('sharp: true');
    expect(workspace).toContain("'@swc/core': true");
    expect(workspace).toContain("minimumReleaseAgeExclude:\n  - '@strapi/*'");
  });

  it('writes package.json onlyBuiltDependencies for pnpm 10', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--use-pnpm'], {
      env: { npm_config_user_agent: 'pnpm/10.25.0 npm/? node/v24.12.0 darwin arm64' },
    });

    expectExitCode(result, 0);
    expect(readJson(projectDir, 'package.json').pnpm.onlyBuiltDependencies).toEqual(
      expect.arrayContaining(['@swc/core', 'better-sqlite3', 'esbuild', 'sharp'])
    );
    expect(exists(projectDir, 'pnpm-workspace.yaml')).toBe(false);
  });

  it('scaffolds inside an existing Yarn workspace monorepo', async () => {
    const monorepoDir = tempDir();
    const projectDir = path.join(monorepoDir, 'packages', 'strapi-app');
    fs.mkdirSync(path.dirname(projectDir), { recursive: true });
    fs.writeFileSync(
      path.join(monorepoDir, 'package.json'),
      JSON.stringify({ private: true, packageManager: 'yarn@4.12.0', workspaces: ['packages/*'] })
    );
    fs.writeFileSync(path.join(monorepoDir, '.yarnrc.yml'), 'nodeLinker: pnp\n');

    const result = await csa([projectDir, ...baseScaffoldArgs, '--use-yarn'], { env: yarnBerry });

    expectExitCode(result, 0);
    expect(read(projectDir, '.yarnrc.yml')).toBe('nodeLinker: node-modules\n');
    expect(read(monorepoDir, '.yarnrc.yml')).toBe('nodeLinker: pnp\n');
  });

  it('does not ask for a Strapi Cloud login or write a trial license', async () => {
    const projectDir = tempDir();
    // No --non-interactive and no --skip-cloud: this combination used to open the cloud login prompt.
    const result = await csa([projectDir, ...promptFreeArgs]);

    expectExitCode(result, 0);
    expect(result.stdout).toContain('Your application was created');
    expect(result.output).not.toMatch(cloudPromptPattern);
    expect(exists(projectDir, 'license.txt')).toBe(false);
  });

  it('accepts the legacy --skip-cloud flag as a no-op', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...promptFreeArgs, '--skip-cloud']);

    expectExitCode(result, 0);
    expect(result.stdout).toContain('Your application was created');
    expect(result.output).not.toMatch(/unknown option/i);
    expect(result.output).not.toMatch(cloudPromptPattern);
    expect(exists(projectDir, 'license.txt')).toBe(false);
  });

  it('does not list the legacy no-op flags in --help', async () => {
    const result = await csa(['--help']);

    expectExitCode(result, 0);
    expect(result.stdout).toContain('--non-interactive');
    expect(result.stdout).not.toContain('--skip-cloud');
    expect(result.stdout).not.toContain('--enable-ab-tests');
  });

  it('fails when --non-interactive is used without a directory', async () => {
    const result = await csa(['--non-interactive']);

    expectExitCode(result, 1);
    expect(result.output).toMatch(/non-interactive|directory/i);
  });

  it('switches to non-interactive mode without a terminal', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, '--no-install', '--no-git-init'], {
      env: { CI: 'false' },
    });

    expectExitCode(result, 0);
    expect(result.stdout).toMatch(/not a terminal/i);
    expect(result.stdout).toContain('Your application was created');
    expect(exists(projectDir, 'package.json')).toBe(true);
  });

  it('switches to non-interactive mode with --quickstart and no terminal', async () => {
    const projectDir = tempDir();
    const result = await csa(
      [projectDir, '--quickstart', '--no-run', '--no-install', '--no-git-init'],
      { env: { CI: 'false' } }
    );

    expectExitCode(result, 0);
    expect(result.stdout).toMatch(/not a terminal/i);
    expect(result.output).not.toMatch(cloudPromptPattern);
    expect(result.stdout).toContain('Your application was created');
    expect(exists(projectDir, 'package.json')).toBe(true);
  });

  it.each(['false', 'true'])(
    'preserves custom template devDependencies in automatic prompt mode (CI=%s)',
    async (ci) => {
      const dir = tempDir();
      const templateDir = path.join(dir, 'template');
      const projectDir = path.join(dir, 'project');
      const devDependencies = { typescript: '5.8.3', '@types/node': '24.0.0' };
      fs.mkdirSync(templateDir);
      fs.writeFileSync(path.join(templateDir, 'package.json'), JSON.stringify({ devDependencies }));

      const result = await csa(
        [projectDir, '--template', templateDir, '--no-install', '--no-git-init'],
        { env: { CI: ci } }
      );

      expectExitCode(result, 0);
      expect(result.stdout).toMatch(
        ci === 'true' ? /A CI environment was detected/ : /not a terminal/i
      );
      expect(readJson(projectDir, 'package.json').devDependencies).toEqual(devDependencies);
    }
  );

  it('shows the prompts with --interactive when there is no terminal', async () => {
    const dir = tempDir();
    const projectDir = path.join(dir, 'app');
    const result = await csa(
      [
        '--interactive',
        '--no-install',
        '--no-git-init',
        '--typescript',
        '--no-example',
        '--skip-db',
      ],
      { cwd: dir, env: { CI: 'true' }, input: `${projectDir}\n` }
    );

    expectExitCode(result, 0);
    expect(result.stdout).toContain('What is the name of your project?');
    expect(result.stdout).not.toMatch(/not a terminal|CI environment was detected/i);
    expect(exists(projectDir, 'package.json')).toBe(true);
  });

  it('fails without a directory when there is no terminal', async () => {
    const result = await csa([], { env: { CI: 'false' } });

    expectExitCode(result, 1);
    expect(result.output).toMatch(/directory/i);
    expect(result.output).toMatch(/not a terminal/i);
  });

  it('fails when --interactive and --non-interactive are both set', async () => {
    const projectDir = path.join(tempDir(), 'my-app');
    const result = await csa([projectDir, '--interactive', '--non-interactive']);

    expectExitCode(result, 1);
    expect(result.output).toMatch(/--interactive.*--non-interactive/i);
    expect(fs.existsSync(projectDir)).toBe(false);
  });

  it('fails when --typescript and --javascript are both set', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--typescript', '--javascript']);

    expectExitCode(result, 1);
    expect(result.output).toMatch(/cannot use both|typescript.*javascript/i);
  });

  it('fails when multiple package manager flags are used', async () => {
    const projectDir = tempDir();
    const result = await csa([projectDir, ...baseScaffoldArgs, '--use-npm', '--use-yarn']);

    expectExitCode(result, 1);
    expect(result.output).toMatch(/package manager|use-npm|use-yarn/i);
  });

  it('prints its version with --version', async () => {
    const result = await csa(['--version']);

    expectExitCode(result, 0);
    expect(result.stdout.trim()).toBe(readJson(path.dirname(bin), '..', 'package.json').version);
  });
});
