#!/usr/bin/env node

/**
 * Migration tests: v4 baseline (`--initial <4.x>`) → **always workspace** (this monorepo).
 * Validation always runs against `examples/complex` + workspace packages.
 *
 * Usage (repo root):
 *   yarn test:migrations --initial <4.x semver> [options]
 *   yarn test:migrations --scenario tests/migration/scenarios/v4-to-head.json
 *
 * Examples:
 *   yarn test:migrations --initial legacy --database sqlite --skip-build
 *   yarn test:migrations --scenario tests/migration/scenarios/v4-to-head.json
 *   yarn test:migrations --initial legacy --initial-node 20
 *
 * When --scenario is omitted, you must pass **--initial** (no default). When --scenario is set,
 * `--initial` / `--via` are ignored.
 *
 * Duration: full runs are usually on the order of 1–4 minutes with `--database sqlite --skip-build` on
 * a warm machine; cold nested `yarn install` can be longer. CI uses `timeout 25m` as a safety cap.
 * Use `--print-plan` to resolve the scenario and exit without installs (resolving `legacy` needs npm).
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
const { materializeScenarioVersions } = require('../framework/resolve-strapi-version');

const REPO_ROOT = path.resolve(__dirname, '../../..');

type ScenarioBaseline = {
  type: 'v4-scaffold' | 'v5-pinned' | string;
  initialVersion?: string;
};

type ScenarioStage = {
  id: string;
  type: 'strapi-pinned' | 'workspace' | string;
  version?: string;
  validate?: string[];
};

type Scenario = {
  id?: string;
  dataOrigin?: string;
  baseline: ScenarioBaseline;
  stages: ScenarioStage[];
};

const argv = yargs(hideBin(process.argv))
  .option('scenario', {
    type: 'string',
    describe: 'Scenario JSON file (if set, overrides --initial / --via / --validators)',
  })
  .option('initial', {
    type: 'string',
    describe:
      'Required unless --scenario is set: npm Strapi version to start from (4.x = v4 scaffold+seed, 5.x = pinned v5+seed-v5, `legacy` = latest v4). The last step is always workspace (monorepo), e.g. legacy, 4.26.2, or 5.7.0',
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
    describe:
      'Require this host Node.js major for the whole run (single process; e.g. 20 for Strapi v4 CI)',
  })
  .option('workspace-node', {
    alias: 'final-node',
    type: 'number',
    describe:
      'Alias of --initial-node (same host-runtime guard). Must match --initial-node if both are set',
  })
  .option('validators', {
    type: 'string',
    describe:
      'Comma-separated workspace validators (default: full, or full-ladder if any --via). See tests/migration/framework/validators.ts',
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
    describe:
      'Seed / validation count multiplier (CLI > MIGRATION_MULTIPLIER / SEED_MULTIPLIER > 1)',
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

function loadMigrationDotenv(repoRoot: string = REPO_ROOT): void {
  const ctx = createContext(repoRoot);
  if (fs.existsSync(ctx.DOTENV_PATH)) {
    // eslint-disable-next-line global-require
    require('dotenv').config({ path: ctx.DOTENV_PATH });
  }
}

/** CLI flag → env → hardcoded default. Call after loadMigrationDotenv(). */
function resolveDatabase(): string {
  return (argv.database as string | undefined) || process.env.DATABASE_CLIENT || 'sqlite';
}

/** CLI flag → env → hardcoded default. Call after loadMigrationDotenv(). */
function resolveMultiplier(): number {
  if (argv.multiplier != null && Number.isFinite(Number(argv.multiplier))) {
    return Number(argv.multiplier);
  }
  const fromEnv = Number(process.env.MIGRATION_MULTIPLIER || process.env.SEED_MULTIPLIER);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return 1;
}

/**
 * Single host-runtime guard: the runner is one Node process, so dual majors cannot work.
 * --workspace-node / --final-node are aliases of --initial-node.
 */
function resolveHostNodeMajor(): number | undefined {
  const initial = argv.initialNode as number | undefined;
  const workspace = (argv.workspaceNode ?? argv.finalNode) as number | undefined;
  if (
    initial != null &&
    Number.isFinite(initial) &&
    workspace != null &&
    Number.isFinite(workspace) &&
    initial !== workspace
  ) {
    console.error(
      '\n❌ Cannot use different --initial-node and --workspace-node: the migration runner is a single Node process.\n' +
        '   Pass one host major (e.g. --initial-node 20), or switch Node and re-run.\n'
    );
    process.exit(1);
  }
  const major = initial ?? workspace;
  if (major == null || !Number.isFinite(major)) {
    return undefined;
  }
  return major;
}

function normalizeVia(raw: unknown): string[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .flatMap((x) => String(x).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadScenarioFromFile(p: string): Scenario {
  if (!fs.existsSync(p)) {
    console.error(`Scenario file not found: ${p}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function assertScenarioShape(scenario: Scenario): void {
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
  if (scenario.stages.length === 0) {
    throw new Error('Invalid scenario: stages must be non-empty');
  }
  const workspaceStages = scenario.stages.filter((stage) => stage.type === 'workspace');
  if (workspaceStages.length !== 1) {
    throw new Error(
      'Invalid scenario: exactly one terminal workspace stage is required (migration always ends at workspace)'
    );
  }
  const terminal = scenario.stages[scenario.stages.length - 1];
  if (terminal.type !== 'workspace') {
    throw new Error('Invalid scenario: last stage must be type "workspace"');
  }
  if (!Array.isArray(terminal.validate) || terminal.validate.length === 0) {
    throw new Error(
      `Invalid scenario: workspace stage "${terminal.id}" requires a non-empty "validate" array`
    );
  }
  for (const stage of scenario.stages) {
    if (stage.type === 'strapi-pinned' && !stage.version) {
      throw new Error(`Invalid scenario: stage "${stage.id}" (strapi-pinned) requires "version"`);
    }
    if (stage.type === 'workspace' && stage !== terminal) {
      throw new Error(
        `Invalid scenario: only the terminal stage may be "workspace" (found "${stage.id}")`
      );
    }
  }
}

function inferDataOrigin(baseline: ScenarioBaseline): string {
  if (baseline.type === 'v5-pinned') {
    return 'v5';
  }
  if (baseline.type === 'v4-scaffold') {
    return 'v4';
  }
  return 'v4';
}

/** When not using --scenario, --initial must name the explicit starting Strapi version; the run always ends at workspace. */
function assertCliInitialOrScenario(): void {
  if (argv.scenario) {
    return;
  }
  const init = argv.initial;
  if (init == null || String(init).trim() === '') {
    console.error(
      'Missing --initial: pass a starting Strapi npm version (e.g. --initial legacy, --initial 4.26.2, or --initial 5.7.0).\n' +
        'The last step is always **workspace** (this monorepo); there is no separate final Strapi version.\n' +
        'Or use --scenario <path> to load a JSON plan.'
    );
    process.exit(1);
  }
}

function resolveScenario(): { scenario: Scenario; sourceLabel: string } {
  let scenario: Scenario;
  let sourceLabel: string;

  if (argv.scenario) {
    const scenarioPath = path.resolve(argv.scenario);
    scenario = loadScenarioFromFile(scenarioPath);
    sourceLabel = path.basename(scenarioPath);
  } else {
    const via = normalizeVia(argv.via);
    scenario = buildScenarioFromFlags({
      initial: argv.initial,
      via,
      validators: argv.validators,
    });
    sourceLabel = 'CLI flags';
  }

  materializeScenarioVersions(scenario);
  assertScenarioShape(scenario);
  return { scenario, sourceLabel };
}

function shouldPrintPlanOnly(): boolean {
  return Boolean(argv['print-plan'] || argv.printPlan);
}

function runPrintPlan(): void {
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
      database: resolveDatabase(),
      multiplier: resolveMultiplier(),
    },
  };
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

async function cleanState(ctx: ReturnType<typeof createContext>): Promise<void> {
  console.log('\n🧹 Cleaning previous migration test state...');
  await dockerComposeDownVolumes(ctx);
  await rimraf(ctx.MIGRATION_ROOT);
}

async function run(): Promise<void> {
  const ctx = createContext(REPO_ROOT);

  loadMigrationDotenv();

  assertCliInitialOrScenario();
  assertNodeMajor(resolveHostNodeMajor(), 'initial-node');

  const database = resolveDatabase();
  const multiplier = resolveMultiplier();

  await runWorkspaceBuilds(REPO_ROOT, {
    fullBuild: argv.build,
    skipBuild: argv.skipBuild,
  });

  const { scenario, sourceLabel } = resolveScenario();

  const dataOrigin =
    scenario.dataOrigin != null ? scenario.dataOrigin : inferDataOrigin(scenario.baseline);
  if (scenario.baseline.type === 'v4-scaffold') {
    assertNodeForV4();
  }

  const composeProject = process.env.STRAPI_MIGRATION_COMPOSE_PROJECT || 'strapi_migration_v5';
  const initialVersion = scenario.baseline.initialVersion;
  if (!initialVersion) {
    throw new Error(`Scenario "${scenario.id}" is missing baseline.initialVersion`);
  }
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
      await runValidators(ctx, stage.validate, { multiplier, dbEnv, dataOrigin });
    } else {
      throw new Error(`Unknown stage type: ${stage.type}`);
    }
  }

  console.log(`\n✅ Migration test "${scenario.id}" completed successfully.`);
}

if (shouldPrintPlanOnly()) {
  loadMigrationDotenv();
  assertCliInitialOrScenario();
  runPrintPlan();
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
