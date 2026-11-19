import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * A new TypeScript project enables `typescript.strictTypes` by default. `strapi build` compiles the
 * server with diagnostics enforced (`noEmitOnError: true` in the templates), so a scaffolded
 * project must type-check with zero diagnostics once its types are generated.
 *
 * Projects are scaffolded without installing dependencies; their `node_modules` links to the
 * monorepo's, so `@strapi/*` resolve to the built workspace packages.
 */

const repoRoot = path.resolve(__dirname, '../../../..');
const csaBin = path.join(repoRoot, 'packages/cli/create-strapi-app/bin/index.js');
const strapiBin = path.join(repoRoot, 'packages/core/strapi/bin/strapi.js');
const tscBin = path.join(repoRoot, 'node_modules/typescript/bin/tsc');
const repoNodeModules = path.join(repoRoot, 'node_modules');

const baseScaffoldArgs = ['--non-interactive', '--skip-cloud', '--no-install', '--no-git-init'];

const BASE_ARTIFACTS = ['contentTypes.d.ts', 'components.d.ts'];
const STRICT_ARTIFACTS = [
  'strict.d.ts',
  'plugins.d.ts',
  'services.ts',
  'controllers.ts',
  'policies.ts',
  'middlewares.ts',
];

const TS_TEMPLATES = [
  { template: 'vanilla', args: [] },
  { template: 'example', args: ['--example'] },
];

const STEP_TIMEOUT_MS = 5 * 60 * 1000;

jest.setTimeout(10 * 60 * 1000);

function runNode(args: string[], cwd: string) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    timeout: STEP_TIMEOUT_MS,
    env: { ...process.env, STRAPI_TELEMETRY_DISABLED: 'true', FORCE_COLOR: '0' },
  });

  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function mkProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-csa-strict-types-test-'));
}

/**
 * Runs a step and fails with its output, so that a failure lists the errors or diagnostics
 */
function runStep(step: string, args: string[], cwd: string) {
  const result = runNode(args, cwd);

  if (result.status !== 0) {
    throw new Error(`${step} exited with ${result.status}:\n${result.output}`);
  }
}

function scaffold(projectDir: string, args: string[]) {
  runStep('create-strapi-app', [csaBin, projectDir, ...baseScaffoldArgs, ...args], repoRoot);

  // Without install, the scaffold leaves an empty node_modules directory
  const nodeModules = path.join(projectDir, 'node_modules');
  if (fs.existsSync(nodeModules) === true) {
    fs.rmdirSync(nodeModules);
  }
  fs.symlinkSync(repoNodeModules, nodeModules, 'dir');
}

function setStrictTypes(projectDir: string, strictTypes: boolean) {
  const configPath = path.join(projectDir, 'config', 'typescript.ts');
  const config = fs.readFileSync(configPath, 'utf8');

  expect(config).toContain('strictTypes: true');

  fs.writeFileSync(configPath, config.replace('strictTypes: true', `strictTypes: ${strictTypes}`));
}

function generateTypes(projectDir: string) {
  runStep('strapi ts:generate-types', [strapiBin, 'ts:generate-types'], projectDir);
}

function typeCheck(projectDir: string) {
  runStep('tsc', [tscBin, '-p', 'tsconfig.json', '--noEmit'], projectDir);
}

function removeProject(projectDir: string) {
  // Unlink first so that the removal never walks into the monorepo's node_modules
  const nodeModules = path.join(projectDir, 'node_modules');
  if (fs.lstatSync(nodeModules, { throwIfNoEntry: false })?.isSymbolicLink() === true) {
    fs.unlinkSync(nodeModules);
  }
  fs.rmSync(projectDir, { recursive: true, force: true });
}

function generatedFiles(projectDir: string) {
  return fs.readdirSync(path.join(projectDir, 'types', 'generated'));
}

describe('create-strapi-app strict types', () => {
  beforeAll(() => {
    for (const bin of [csaBin, path.join(repoRoot, 'packages/core/strapi/dist/cli.js')]) {
      if (fs.existsSync(bin) === false) {
        throw new Error(`${bin} is missing; build the monorepo first`);
      }
    }
  });

  it.each(TS_TEMPLATES)(
    'the $template template compiles with strict types enabled by default',
    ({ args }) => {
      const projectDir = mkProjectDir();

      try {
        scaffold(projectDir, args);
        generateTypes(projectDir);

        expect(generatedFiles(projectDir)).toEqual(
          expect.arrayContaining([...BASE_ARTIFACTS, ...STRICT_ARTIFACTS])
        );

        typeCheck(projectDir);
      } finally {
        removeProject(projectDir);
      }
    }
  );

  it.each(TS_TEMPLATES)(
    'the $template template compiles without the strict artifacts when strictTypes is false',
    ({ args }) => {
      const projectDir = mkProjectDir();

      try {
        scaffold(projectDir, args);
        setStrictTypes(projectDir, false);
        generateTypes(projectDir);

        const files = generatedFiles(projectDir);

        expect(files).toEqual(expect.arrayContaining(BASE_ARTIFACTS));
        for (const artifact of STRICT_ARTIFACTS) {
          expect(files).not.toContain(artifact);
        }

        typeCheck(projectDir);
      } finally {
        removeProject(projectDir);
      }
    }
  );
});
