#!/usr/bin/env node
'use strict';

/**
 * Migration tests: v4 baseline (`--initial <4.x>`) → **always workspace** (this monorepo).
 * Validation always runs against `examples/complex` + workspace packages.
 *
 * Usage (repo root):
 *   yarn test:migrations --initial <4.x semver> [options]
 *   yarn test:migrations --scenario tests/migration/scenarios/v4-to-head.json
 *
 * Examples:
 *   yarn test:migrations --initial 4.26.0 --database sqlite --skip-build
 *   yarn test:migrations --scenario tests/migration/scenarios/v4-to-head.json
 *   yarn test:migrations --initial 4.26.0 --initial-node 20 --workspace-node 24
 *
 * When --scenario is omitted, you must pass **--initial** (no default). When --scenario is set,
 * `--initial` / `--via` are ignored.
 *
 * Duration: full runs are usually on the order of 1–4 minutes with `--database sqlite --skip-build` on
 * a warm machine; cold nested `yarn install` can be longer. CI uses `timeout 25m` as a safety cap.
 * Use `--print-plan` to resolve the scenario and exit in under a second (no installs, no network).
 */

const fs = require('fs');
const path = require('path');
const { rimraf } = require('rimraf');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { createContext } = require('../framework/context');
const {
  dockerComposeDownVolumes,
  resolveDockerHostPorts,
  buildDatabaseEnvForClient,
  assertNodeForV4,
  runWorkspaceBuilds,
} = require('../framework/shared');
const { runV4Baseline } = require('../framework/baseline-v4');
const { runV5PinnedBaseline } = require('../framework/baseline-v5-pinned');
const { runPinnedStrapiStage } = require('../framework/stage-pinned-v5');
const { runValidators } = require('../framework/validators');
const { buildScenarioFromFlags } = require('../framework/build-scenario');
const { assertNodeMajor } = require('../framework/node-check');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const argv = yargs(hideBin(process.argv))
  .option('scenario', {
    type: 'string',
    describe: 'Scenario JSON file (if set, overrides --initial / --via / --validators)',
  })
  .option('initial', {
    type: 'string',
    describe:
      'Required unless --scenario is set: explicit npm Strapi version to start from (4.x = v4 scaffold+seed, 5.x = pinned v5+seed-v5). The last step is always workspace (monorepo), e.g. 4.26.0 or 5.7.0',
  })
  .option('via', {
    alias: 'v',
    type: 'array',
    default: [],
    describe:
      'Pinned Strapi npm version(s) to boot after seed, before workspace (repeat flag, e.g. --via 5.30.0)',
  })
  .option('initial-node', {
    type: 'number',
    describe: 'Require this Node.js major for the baseline phase (e.g. 20 for Strapi v4)',
  })
  .option('workspace-node', {
    alias: 'final-node',
    type: 'number',
    describe:
      'Require this Node.js major for the workspace (monorepo) validation step only — not a Strapi version; final Strapi is always workspace',
  })
  .option('validators', {
    type: 'string',
    describe:
      'Comma-separated workspace validators (default: full, or full-ladder if any --via). See tests/migration/framework/validators.js',
  })
  .option('database', {
    alias: 'd',
    type: 'string',
    choices: ['postgres', 'mysql', 'mariadb', 'sqlite'],
    describe:
      'Database engine for seed and validation (mariadb: MariaDB server via mysql2 / DATABASE_CLIENT=mysql)',
  })
  .option('multiplier', {
    alias: 'm',
    type: 'number',
    default: 1,
    describe: 'Seed / validation count multiplier',
  })
  .option('build', {
    type: 'boolean',
    default: false,
    describe: 'Run `yarn build` at repo root before testing',
  })
  .option('skip-build', {
    type: 'boolean',
    default: false,
    describe:
      'Skip `@strapi/core` + `@strapi/database` workspace builds before tests (only if dist already matches source)',
  })
  .option('print-plan', {
    type: 'boolean',
    default: false,
    describe:
      'Only resolve and print the migration plan (JSON) and exit: no build, no Docker, no yarn in nested apps',
  })
  .help()
  .parse();

const database = argv.database || process.env.DATABASE_CLIENT || 'sqlite';
const multiplier =
  argv.multiplier || Number(process.env.MIGRATION_MULTIPLIER || process.env.SEED_MULTIPLIER) || 1;

function normalizeVia(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .flatMap((x) => String(x).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadScenarioFromFile(p) {
  if (!fs.existsSync(p)) {
    console.error(`Scenario file not found: ${p}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function assertScenarioShape(scenario) {
  if (!scenario || typeof scenario !== 'object') {
    throw new Error('Invalid scenario: expected an object');
  }
  if (!scenario.baseline) {
    throw new Error('Invalid scenario: missing baseline');
  }
  const t = scenario.baseline.type;
  if (t !== 'v4-scaffold' && t !== 'v5-pinned') {
    throw new Error('Invalid scenario: baseline.type must be "v4-scaffold" or "v5-pinned"');
  }
  if (!scenario.baseline.initialVersion) {
    throw new Error('Invalid scenario: baseline.initialVersion is required');
  }
  if (!Array.isArray(scenario.stages)) {
    throw new Error('Invalid scenario: stages must be an array');
  }
  for (const stage of scenario.stages) {
    if (stage.type === 'strapi-pinned' && !stage.version) {
      throw new Error(`Invalid scenario: stage "${stage.id}" (strapi-pinned) requires "version"`);
    }
    if (stage.type === 'workspace' && !Array.isArray(stage.validate)) {
      throw new Error(
        `Invalid scenario: stage "${stage.id}" (workspace) requires "validate" array`
      );
    }
  }
}

function inferDataOrigin(baseline) {
  if (baseline.type === 'v5-pinned') {
    return 'v5';
  }
  if (baseline.type === 'v4-scaffold') {
    return 'v4';
  }
  return 'v4';
}

/** When not using --scenario, --initial must name the explicit starting Strapi version; the run always ends at workspace. */
function assertCliInitialOrScenario() {
  if (argv.scenario) {
    return;
  }
  const init = argv.initial;
  if (init == null || String(init).trim() === '') {
    console.error(
      'Missing --initial: pass an explicit starting Strapi npm version (e.g. --initial 4.26.0 or --initial 5.7.0).\n' +
        'The last step is always **workspace** (this monorepo); there is no separate final Strapi version.\n' +
        'Or use --scenario <path> to load a JSON plan.'
    );
    process.exit(1);
  }
}

function resolveScenario() {
  if (argv.scenario) {
    const scenarioPath = path.resolve(argv.scenario);
    const scenario = loadScenarioFromFile(scenarioPath);
    assertScenarioShape(scenario);
    return { scenario, sourceLabel: path.basename(scenarioPath) };
  }

  const via = normalizeVia(argv.via);
  const scenario = buildScenarioFromFlags({
    initial: argv.initial,
    via,
    validators: argv.validators,
  });
  assertScenarioShape(scenario);
  return { scenario, sourceLabel: 'CLI flags' };
}

function shouldPrintPlanOnly() {
  return Boolean(argv['print-plan'] || argv.printPlan);
}

function runPrintPlan() {
  const { scenario, sourceLabel } = resolveScenario();
  const dataOrigin =
    scenario.dataOrigin != null ? scenario.dataOrigin : inferDataOrigin(scenario.baseline);
  const viaList = scenario.stages.filter((s) => s.type === 'strapi-pinned').map((s) => s.version);
  const plan = {
    id: scenario.id,
    source: sourceLabel,
    dataOrigin,
    baseline: scenario.baseline,
    pinned: viaList,
    stages: scenario.stages,
    destination: 'workspace',
    note: 'Final Strapi is always the monorepo (examples/complex); there is no --final version flag.',
    wouldUse: {
      database: argv.database || process.env.DATABASE_CLIENT || 'sqlite',
      multiplier: argv.multiplier || Number(process.env.MIGRATION_MULTIPLIER) || 1,
    },
  };
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

async function cleanState(ctx) {
  console.log('\n🧹 Cleaning previous migration test state...');
  await dockerComposeDownVolumes(ctx);
  await rimraf(ctx.MIGRATION_ROOT);
}

async function run() {
  const ctx = createContext(REPO_ROOT);

  if (fs.existsSync(ctx.DOTENV_PATH)) {
    // eslint-disable-next-line global-require
    require('dotenv').config({ path: ctx.DOTENV_PATH });
  }

  assertCliInitialOrScenario();

  await runWorkspaceBuilds(REPO_ROOT, {
    fullBuild: argv.build,
    skipBuild: argv.skipBuild,
  });

  assertNodeMajor(argv.initialNode, 'initial-node');

  const { scenario, sourceLabel } = resolveScenario();

  const dataOrigin =
    scenario.dataOrigin != null ? scenario.dataOrigin : inferDataOrigin(scenario.baseline);
  if (scenario.baseline.type === 'v4-scaffold') {
    assertNodeForV4();
  }

  const composeProject = process.env.STRAPI_MIGRATION_COMPOSE_PROJECT || 'strapi_migration_v5';
  const initialVersion = scenario.baseline.initialVersion || '4.26.0';
  const viaList = scenario.stages.filter((s) => s.type === 'strapi-pinned').map((s) => s.version);
  console.log(
    `\n📌 Migration test "${scenario.id}" (${sourceLabel})\n` +
      `   baseline=${scenario.baseline.type}@${initialVersion}, dataOrigin=${dataOrigin}, via=[${
        viaList.join(', ') || '—'
      }], ` +
      `database=${database}, multiplier=${multiplier}, compose=${composeProject}`
  );

  if (database === 'postgres' || database === 'mysql' || database === 'mariadb') {
    await resolveDockerHostPorts(database);
  }

  await cleanState(ctx);

  const dbEnv = buildDatabaseEnvForClient(ctx, database);

  if (scenario.baseline.type === 'v4-scaffold') {
    await runV4Baseline(ctx, {
      database,
      multiplier,
      dbEnv,
      initialVersion,
    });
  } else if (scenario.baseline.type === 'v5-pinned') {
    await runV5PinnedBaseline(ctx, {
      database,
      multiplier,
      dbEnv,
      initialVersion,
    });
  } else {
    throw new Error(`Unknown baseline type: ${scenario.baseline.type}`);
  }

  for (const stage of scenario.stages) {
    console.log(`\n── Stage: ${stage.id} (${stage.type}) ──`);
    if (stage.type === 'strapi-pinned') {
      await runPinnedStrapiStage(ctx, { ...stage, dbEnv });
    } else if (stage.type === 'workspace') {
      assertNodeMajor(argv.workspaceNode ?? argv.finalNode, 'workspace-node');
      await runValidators(ctx, stage.validate, { multiplier, dbEnv, dataOrigin });
    } else {
      throw new Error(`Unknown stage type: ${stage.type}`);
    }
  }

  console.log(`\n✅ Migration test "${scenario.id}" completed successfully.`);
}

if (shouldPrintPlanOnly()) {
  const printCtx = createContext(REPO_ROOT);
  if (fs.existsSync(printCtx.DOTENV_PATH)) {
    // eslint-disable-next-line global-require
    require('dotenv').config({ path: printCtx.DOTENV_PATH });
  }
  assertCliInitialOrScenario();
  runPrintPlan();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
