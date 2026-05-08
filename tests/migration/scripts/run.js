#!/usr/bin/env node
'use strict';

/**
 * Docker-native v4 → v5 migration test orchestrator.
 *
 * The host runs **only this script**. All Strapi v4 / pinned-v5 work happens
 * inside a single Node-20 runner container with `yarn install` + native
 * compilation set up. The host's Node version, yarn version, and python/cc
 * stack are irrelevant. The host's only job is:
 *
 *   1. Resolve a scenario (CLI flags or JSON file).
 *   2. Hydrate disposable Strapi apps from the checked-in skeletons under
 *      `tests/migration/skeleton/{v4,v5-pinned}` plus the live schemas under
 *      `examples/complex/src/api`.
 *   3. Drive `docker compose` to:
 *        - bring up the requested DB (postgres / mysql / mariadb), or none
 *          for sqlite,
 *        - run baseline + pinned-v5 stages inside the runner container,
 *        - run the workspace validation step on the host (workspace Strapi
 *          is built locally and supports Node 20–24, matching the project
 *          engines).
 *   4. Tear everything down.
 *
 * Usage (from repo root):
 *
 *   yarn test:migrations --initial 4.26.0 --database sqlite
 *   yarn test:migrations --initial 4.26.0 --via 5.30.0 --database postgres
 *   yarn test:migrations --scenario tests/migration/scenarios/v4-to-head.json
 *   yarn test:migrations --print-plan --initial 4.26.0
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const MIGRATION_DIR = path.resolve(__dirname, '..');
const DOCKER_DIR = path.join(MIGRATION_DIR, 'docker');
const COMPOSE_FILE = path.join(DOCKER_DIR, 'docker-compose.yml');
const SKELETON_DIR = path.join(MIGRATION_DIR, 'skeleton');
const SCENARIOS_DIR = path.join(MIGRATION_DIR, 'scenarios');
const COMPLEX_DIR = path.join(REPO_ROOT, 'examples', 'complex');
const STATE_DIR = path.join(COMPLEX_DIR, '.migration-v5');

const COMPOSE_PROJECT = process.env.STRAPI_MIGRATION_COMPOSE_PROJECT || 'strapi_migration_v5';

const HOST_PORTS = {
  postgres: Number(process.env.POSTGRES_HOST_PORT) || 15432,
  mysql: Number(process.env.MYSQL_HOST_PORT) || 13306,
  mariadb: Number(process.env.MARIADB_HOST_PORT) || 13307,
};

const CONTENT_TYPES = [
  'basic',
  'basic-dp',
  'basic-dp-i18n',
  'relation',
  'relation-dp',
  'relation-dp-i18n',
  'hc-m2m-source',
  'hc-m2m-target',
];

// ============================================================================
// CLI
// ============================================================================

const argv = yargs(hideBin(process.argv))
  .usage('Usage: yarn test:migrations [options]')
  .option('scenario', {
    type: 'string',
    describe: 'Scenario JSON file (overrides --initial / --via / --validators)',
  })
  .option('initial', {
    type: 'string',
    describe:
      'Required unless --scenario is set: starting Strapi npm version. 4.x = v4 scaffold, 5.x = pinned-v5 scaffold. Last stage is always workspace.',
  })
  .option('via', {
    alias: 'v',
    type: 'array',
    default: [],
    describe: 'Pinned Strapi npm version(s) to boot between baseline and workspace',
  })
  .option('validators', {
    type: 'string',
    describe: 'Comma-separated workspace validators (default depends on baseline + via)',
  })
  .option('database', {
    alias: 'd',
    type: 'string',
    choices: ['postgres', 'mysql', 'mariadb', 'sqlite'],
    default: 'postgres',
  })
  .option('multiplier', {
    alias: 'm',
    type: 'number',
    default: 1,
    describe: 'Seed / validation count multiplier',
  })
  .option('print-plan', {
    type: 'boolean',
    default: false,
    describe: 'Resolve and print the scenario plan, then exit (no Docker, no installs)',
  })
  .option('keep-state', {
    type: 'boolean',
    default: false,
    describe: 'Skip teardown at the end (leave containers + state dir intact for inspection)',
  })
  .option('rebuild-image', {
    type: 'boolean',
    default: false,
    describe: 'Force `docker compose build runner` before stages',
  })
  .help()
  .parse();

// ============================================================================
// Scenario resolution
// ============================================================================

function loadScenarioFromFile(p) {
  if (!fs.existsSync(p)) {
    console.error(`Scenario file not found: ${p}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function buildScenarioFromFlags({ initial, via, validators }) {
  const init = String(initial || '').trim();
  if (!init) {
    throw new Error('Missing --initial or --scenario.');
  }
  const major = Number(init.split('.')[0]);
  if (major !== 4 && major !== 5) {
    throw new Error(`--initial must be 4.x or 5.x, got "${init}".`);
  }
  const viaList = (via || [])
    .flatMap((x) => String(x).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  const stages = viaList.map((version) => ({
    id: `pinned-${version}`,
    type: 'strapi-pinned',
    version,
  }));
  const defaults =
    viaList.length > 0 ? ['full-ladder'] : major === 5 ? ['full-v5-origin'] : ['full-v4-origin'];
  const validateNames = validators
    ? validators
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : defaults;
  stages.push({ id: 'workspace', type: 'workspace', validate: validateNames });
  return {
    id: `cli-${init.replace(/\./g, '-')}${viaList.length ? `-via-${viaList.map((v) => v.replace(/\./g, '-')).join('-')}` : ''}-workspace`,
    description: 'Built from CLI flags',
    dataOrigin: major === 5 ? 'v5' : 'v4',
    baseline: {
      type: major === 4 ? 'v4-scaffold' : 'v5-pinned',
      initialVersion: init,
    },
    stages,
  };
}

function assertScenarioShape(scenario) {
  if (!scenario || typeof scenario !== 'object') throw new Error('Invalid scenario');
  if (!scenario.baseline) throw new Error('Invalid scenario: missing baseline');
  const t = scenario.baseline.type;
  if (t !== 'v4-scaffold' && t !== 'v5-pinned') {
    throw new Error('Invalid scenario: baseline.type must be "v4-scaffold" or "v5-pinned"');
  }
  if (!scenario.baseline.initialVersion)
    throw new Error('Invalid scenario: baseline.initialVersion required');
  if (!Array.isArray(scenario.stages)) throw new Error('Invalid scenario: stages must be an array');
}

function resolveScenario() {
  if (argv.scenario) {
    const p = path.resolve(argv.scenario);
    const scenario = loadScenarioFromFile(p);
    assertScenarioShape(scenario);
    return { scenario, sourceLabel: path.basename(p) };
  }
  const scenario = buildScenarioFromFlags({
    initial: argv.initial,
    via: argv.via,
    validators: argv.validators,
  });
  assertScenarioShape(scenario);
  return { scenario, sourceLabel: 'CLI flags' };
}

// ============================================================================
// Compose / Docker helpers
// ============================================================================

function composeEnv() {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 0;
  const gid = typeof process.getgid === 'function' ? process.getgid() : 0;
  return {
    ...process.env,
    COMPOSE_PROJECT_NAME: COMPOSE_PROJECT,
    REPO_ROOT,
    MIGRATION_STATE_DIR: STATE_DIR,
    RUNNER_UID: String(uid),
    RUNNER_GID: String(gid),
    POSTGRES_HOST_PORT: String(HOST_PORTS.postgres),
    MYSQL_HOST_PORT: String(HOST_PORTS.mysql),
    MARIADB_HOST_PORT: String(HOST_PORTS.mariadb),
  };
}

function compose(args, opts = {}) {
  const result = spawnSync(
    'docker',
    ['compose', '-p', COMPOSE_PROJECT, '-f', COMPOSE_FILE, ...args],
    {
      stdio: 'inherit',
      cwd: DOCKER_DIR,
      env: { ...composeEnv(), ...(opts.env || {}) },
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`docker compose ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function composeRunRunner(envVars, command) {
  const envArgs = Object.entries(envVars).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
  compose(['run', '--rm', '-T', ...envArgs, 'runner', 'bash', '-lc', command]);
}

function ensureRunnerImage(forceRebuild) {
  if (forceRebuild) {
    console.log('\n🔨 Rebuilding runner image…');
    compose(['build', 'runner']);
    return;
  }
  // Cheap check: if `compose images runner` reports nothing, build.
  const result = spawnSync(
    'docker',
    ['compose', '-p', COMPOSE_PROJECT, '-f', COMPOSE_FILE, 'images', '-q', 'runner'],
    { cwd: DOCKER_DIR, env: composeEnv(), encoding: 'utf8' }
  );
  if (result.status !== 0 || !String(result.stdout || '').trim()) {
    console.log('\n🔨 Building runner image (first run)…');
    compose(['build', 'runner']);
  }
}

function startDb(database) {
  if (database === 'sqlite') return;
  console.log(`\n🗄  Starting ${database}…`);
  compose(['up', '-d', '--wait', database]);
}

function teardown() {
  if (argv.keepState) {
    console.log('\n🪟 --keep-state: leaving containers + state dir intact.');
    return;
  }
  console.log('\n🧹 Tearing down compose stack…');
  try {
    compose(['down', '-v', '--remove-orphans']);
  } catch (err) {
    console.warn(`  (compose down warning: ${err.message})`);
  }
}

// ============================================================================
// State / skeleton hydration
// ============================================================================

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function ensureCleanStateDir() {
  // Wipe disposable apps but keep the runner cache + home dirs across runs so
  // `yarn install` is fast on warm runs (one yarn install in v4 is ~3 min cold,
  // ~30s warm). The `.runner-home` and `.yarn-cache` dirs hold yarn's global
  // state and the package cache; nothing in there is run-specific.
  if (fs.existsSync(STATE_DIR)) {
    for (const entry of fs.readdirSync(STATE_DIR)) {
      if (entry === '.runner-home' || entry === '.yarn-cache') continue;
      rmrf(path.join(STATE_DIR, entry));
    }
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(path.join(STATE_DIR, '.runner-home'), { recursive: true });
  fs.mkdirSync(path.join(STATE_DIR, '.yarn-cache'), { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

function renderTemplate(srcPath, destPath, vars) {
  let text = fs.readFileSync(srcPath, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    text = text.split(`__${key}__`).join(value);
  }
  fs.writeFileSync(destPath, text);
}

function generateContentTypeFiles(appDir) {
  const apiDir = path.join(appDir, 'src', 'api');
  fs.mkdirSync(apiDir, { recursive: true });

  for (const ct of CONTENT_TYPES) {
    const ctDir = path.join(apiDir, ct);
    const schemaSrc = path.join(COMPLEX_DIR, 'src', 'api', ct, 'content-types', ct, 'schema.json');
    const schemaDest = path.join(ctDir, 'content-types', ct, 'schema.json');

    if (!fs.existsSync(schemaSrc)) {
      console.warn(`  ⚠️  missing schema for ${ct} at ${schemaSrc}, skipping`);
      continue;
    }

    fs.mkdirSync(path.dirname(schemaDest), { recursive: true });
    fs.copyFileSync(schemaSrc, schemaDest);

    const controllers = path.join(ctDir, 'controllers');
    const routes = path.join(ctDir, 'routes');
    const services = path.join(ctDir, 'services');
    fs.mkdirSync(controllers, { recursive: true });
    fs.mkdirSync(routes, { recursive: true });
    fs.mkdirSync(services, { recursive: true });

    fs.writeFileSync(
      path.join(controllers, `${ct}.js`),
      `'use strict';\nconst { createCoreController } = require('@strapi/strapi').factories;\nmodule.exports = createCoreController('api::${ct}.${ct}');\n`
    );
    fs.writeFileSync(
      path.join(routes, `${ct}.js`),
      `'use strict';\nconst { createCoreRouter } = require('@strapi/strapi').factories;\nmodule.exports = createCoreRouter('api::${ct}.${ct}');\n`
    );
    fs.writeFileSync(
      path.join(services, `${ct}.js`),
      `'use strict';\nconst { createCoreService } = require('@strapi/strapi').factories;\nmodule.exports = createCoreService('api::${ct}.${ct}');\n`
    );
  }
}

function hydrateV4App({ appDir, version }) {
  rmrf(appDir);
  fs.mkdirSync(appDir, { recursive: true });

  copyDir(path.join(SKELETON_DIR, 'v4', 'config'), path.join(appDir, 'config'));
  copyDir(path.join(SKELETON_DIR, 'v4', 'src'), path.join(appDir, 'src'));
  copyDir(path.join(SKELETON_DIR, 'v4', 'public'), path.join(appDir, 'public'));
  fs.copyFileSync(path.join(SKELETON_DIR, 'v4', '.gitignore'), path.join(appDir, '.gitignore'));

  generateContentTypeFiles(appDir);

  // Components are shared between v4 and v5 schemas.
  copyDir(path.join(COMPLEX_DIR, 'src', 'components'), path.join(appDir, 'src', 'components'));

  fs.mkdirSync(path.join(appDir, 'scripts'), { recursive: true });
  fs.copyFileSync(
    path.join(COMPLEX_DIR, 'scripts', 'seed-v4.js'),
    path.join(appDir, 'scripts', 'seed.js')
  );

  renderTemplate(
    path.join(SKELETON_DIR, 'v4', 'package.tmpl.json'),
    path.join(appDir, 'package.json'),
    { STRAPI_VERSION: version, APP_NAME: `complex-v4-${version.replace(/\./g, '-')}` }
  );
  renderTemplate(path.join(SKELETON_DIR, 'v4', '.env.tmpl'), path.join(appDir, '.env'), {});
}

function hydrateV5PinnedApp({ appDir, version, kind }) {
  // kind: 'baseline' (uses seed-v5.js) | 'stage' (boot only)
  rmrf(appDir);
  fs.mkdirSync(appDir, { recursive: true });

  copyDir(path.join(COMPLEX_DIR, 'src'), path.join(appDir, 'src'));
  copyDir(path.join(COMPLEX_DIR, 'config'), path.join(appDir, 'config'));
  copyDir(path.join(COMPLEX_DIR, 'public'), path.join(appDir, 'public'));

  const tsconfigSrc = path.join(COMPLEX_DIR, 'tsconfig.json');
  if (fs.existsSync(tsconfigSrc)) {
    fs.copyFileSync(tsconfigSrc, path.join(appDir, 'tsconfig.json'));
  }

  fs.mkdirSync(path.join(appDir, 'scripts'), { recursive: true });
  if (kind === 'baseline') {
    fs.copyFileSync(
      path.join(COMPLEX_DIR, 'scripts', 'seed-v5.js'),
      path.join(appDir, 'scripts', 'seed.js')
    );
  } else {
    // Boot-once script: load Strapi from this app's node_modules so internal
    // migrations up to `version` are applied, then exit. The orchestrator
    // calls this for every `strapi-pinned` stage.
    fs.writeFileSync(
      path.join(appDir, 'scripts', 'boot-once.js'),
      `#!/usr/bin/env node
'use strict';
const path = require('path');
const Module = require('module');
const appRoot = __dirname.replace(/\\/scripts$/, '');
const req = Module.createRequire(path.join(appRoot, 'package.json'));
async function main() {
  process.chdir(appRoot);
  const { createStrapi, compileStrapi } = req('@strapi/strapi');
  const appCtx = await compileStrapi();
  const strapi = await createStrapi(appCtx).load();
  strapi.log.level = 'error';
  await strapi.destroy();
  console.log('\\n✅ Pinned Strapi boot completed (' + appRoot + ')');
}
main().catch((err) => { console.error(err); process.exit(1); });
`
    );
  }

  renderTemplate(
    path.join(SKELETON_DIR, 'v5-pinned', 'package.tmpl.json'),
    path.join(appDir, 'package.json'),
    { STRAPI_VERSION: version, APP_NAME: `complex-v5-${version.replace(/\./g, '-')}-${kind}` }
  );
  renderTemplate(path.join(SKELETON_DIR, 'v5-pinned', '.env.tmpl'), path.join(appDir, '.env'), {});
}

// ============================================================================
// DB env builders
// ============================================================================

function dbEnvForRunner(database) {
  // Inside the runner container, DB hosts are the compose service names.
  switch (database) {
    case 'sqlite':
      return {
        DATABASE_CLIENT: 'sqlite',
        DATABASE_FILENAME: '/work/migration.sqlite',
      };
    case 'postgres':
      return {
        DATABASE_CLIENT: 'postgres',
        DATABASE_HOST: 'postgres',
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'strapi',
        DATABASE_USERNAME: 'strapi',
        DATABASE_PASSWORD: 'strapi',
      };
    case 'mysql':
      return {
        DATABASE_CLIENT: 'mysql',
        DATABASE_HOST: 'mysql',
        DATABASE_PORT: '3306',
        DATABASE_NAME: 'strapi',
        DATABASE_USERNAME: 'strapi',
        DATABASE_PASSWORD: 'strapi',
      };
    case 'mariadb':
      return {
        DATABASE_CLIENT: 'mysql',
        DATABASE_HOST: 'mariadb',
        DATABASE_PORT: '3306',
        DATABASE_NAME: 'strapi',
        DATABASE_USERNAME: 'strapi',
        DATABASE_PASSWORD: 'strapi',
      };
    default:
      throw new Error(`Unknown database: ${database}`);
  }
}

function dbEnvForHost(database) {
  // On the host, DB hosts are localhost + published ports.
  switch (database) {
    case 'sqlite':
      return {
        DATABASE_CLIENT: 'sqlite',
        DATABASE_FILENAME: path.join(STATE_DIR, 'migration.sqlite'),
      };
    case 'postgres':
      return {
        DATABASE_CLIENT: 'postgres',
        DATABASE_HOST: '127.0.0.1',
        DATABASE_PORT: String(HOST_PORTS.postgres),
        DATABASE_NAME: 'strapi',
        DATABASE_USERNAME: 'strapi',
        DATABASE_PASSWORD: 'strapi',
      };
    case 'mysql':
      return {
        DATABASE_CLIENT: 'mysql',
        DATABASE_HOST: '127.0.0.1',
        DATABASE_PORT: String(HOST_PORTS.mysql),
        DATABASE_NAME: 'strapi',
        DATABASE_USERNAME: 'strapi',
        DATABASE_PASSWORD: 'strapi',
      };
    case 'mariadb':
      return {
        DATABASE_CLIENT: 'mysql',
        DATABASE_HOST: '127.0.0.1',
        DATABASE_PORT: String(HOST_PORTS.mariadb),
        DATABASE_NAME: 'strapi',
        DATABASE_USERNAME: 'strapi',
        DATABASE_PASSWORD: 'strapi',
      };
    default:
      throw new Error(`Unknown database: ${database}`);
  }
}

// ============================================================================
// Stage runners
// ============================================================================

function runV4Baseline({ initialVersion, database, multiplier }) {
  const appDir = path.join(STATE_DIR, 'v4-app');
  const containerAppDir = '/work/v4-app';

  console.log(`\n🌱 v4 baseline (${initialVersion}) on ${database}`);
  hydrateV4App({ appDir, version: initialVersion });

  const env = {
    ...dbEnvForRunner(database),
    SEED_MULTIPLIER: String(multiplier),
  };

  composeRunRunner(
    env,
    `set -e \
     && cd ${containerAppDir} \
     && yarn install \
     && node scripts/seed.js --multiplier ${multiplier}`
  );
}

function runV5PinnedBaseline({ initialVersion, database, multiplier }) {
  const slug = initialVersion.replace(/\./g, '-');
  const appDir = path.join(STATE_DIR, `v5-baseline-${slug}`);
  const containerAppDir = `/work/v5-baseline-${slug}`;

  console.log(`\n🌱 v5-pinned baseline (${initialVersion}) on ${database}`);
  hydrateV5PinnedApp({ appDir, version: initialVersion, kind: 'baseline' });

  const env = {
    ...dbEnvForRunner(database),
    SEED_MULTIPLIER: String(multiplier),
  };

  composeRunRunner(
    env,
    `set -e \
     && cd ${containerAppDir} \
     && yarn install \
     && node scripts/seed.js --multiplier ${multiplier}`
  );
}

function runStrapiPinnedStage({ version, database }) {
  const slug = version.replace(/\./g, '-');
  const appDir = path.join(STATE_DIR, `pinned-${slug}`);
  const containerAppDir = `/work/pinned-${slug}`;

  console.log(`\n🚀 Booting pinned Strapi ${version} on ${database}`);
  hydrateV5PinnedApp({ appDir, version, kind: 'stage' });

  const env = dbEnvForRunner(database);

  composeRunRunner(
    env,
    `set -e \
     && cd ${containerAppDir} \
     && yarn install \
     && node scripts/boot-once.js`
  );
}

function runWorkspaceStage({ stage, database, multiplier, dataOrigin }) {
  console.log(`\n🧪 Workspace validation (${stage.validate.join(', ')}) on ${database}`);

  const env = {
    ...process.env,
    ...dbEnvForHost(database),
    MIGRATION_MULTIPLIER: String(multiplier),
    SEED_MULTIPLIER: String(multiplier),
    MIGRATION_DATA_ORIGIN: dataOrigin,
  };

  // `full-ladder` is the same script + a flag to skip DP join-table parity.
  const skipJoinParity = stage.validate.some((v) => v === 'full-ladder');
  if (skipJoinParity) {
    env.MIGRATION_SKIP_DP_JOIN_PARITY = '1';
  }

  // Sanity: at least one validator must be a known full-* one. We don't try
  // to map every legacy validator name; the workspace script reads
  // MIGRATION_DATA_ORIGIN + MIGRATION_SKIP_DP_JOIN_PARITY and does the rest.
  const known = new Set(['full', 'full-v4-origin', 'full-v5-origin', 'full-ladder']);
  for (const v of stage.validate) {
    if (!known.has(v)) {
      throw new Error(`Unknown validator "${v}". Known: ${[...known].join(', ')}`);
    }
  }

  const result = spawnSync(
    'node',
    [path.join('scripts', 'validate-migration.js'), '--multiplier', String(multiplier)],
    { stdio: 'inherit', cwd: COMPLEX_DIR, env }
  );
  if (result.status !== 0) {
    throw new Error(`Workspace validation failed (exit ${result.status}).`);
  }
}

// ============================================================================
// Main
// ============================================================================

function inferDataOrigin(scenario) {
  if (scenario.dataOrigin) return scenario.dataOrigin;
  return scenario.baseline.type === 'v5-pinned' ? 'v5' : 'v4';
}

function printPlan() {
  const { scenario, sourceLabel } = resolveScenario();
  const dataOrigin = inferDataOrigin(scenario);
  const viaList = scenario.stages.filter((s) => s.type === 'strapi-pinned').map((s) => s.version);
  const plan = {
    id: scenario.id,
    source: sourceLabel,
    dataOrigin,
    baseline: scenario.baseline,
    pinned: viaList,
    stages: scenario.stages,
    destination: 'workspace',
    note: 'Final Strapi is always the monorepo (examples/complex); there is no --final flag.',
    wouldUse: { database: argv.database, multiplier: argv.multiplier, runner: 'docker' },
  };
  console.log(JSON.stringify(plan, null, 2));
}

async function main() {
  if (argv['print-plan'] || argv.printPlan) {
    printPlan();
    return;
  }

  const { scenario, sourceLabel } = resolveScenario();
  const dataOrigin = inferDataOrigin(scenario);
  const database = argv.database;
  const multiplier = argv.multiplier;

  console.log(
    `\n📌 Migration test "${scenario.id}" (${sourceLabel})\n` +
      `   baseline=${scenario.baseline.type}@${scenario.baseline.initialVersion}, ` +
      `dataOrigin=${dataOrigin}, ` +
      `pinned=[${
        scenario.stages
          .filter((s) => s.type === 'strapi-pinned')
          .map((s) => s.version)
          .join(', ') || '—'
      }], ` +
      `database=${database}, multiplier=${multiplier}`
  );

  // Always start clean: nuke any previous run's state + containers.
  ensureCleanStateDir();
  try {
    compose(['down', '-v', '--remove-orphans']);
  } catch (err) {
    // First run: no project to take down. That's fine.
  }

  ensureRunnerImage(argv.rebuildImage);
  startDb(database);

  try {
    if (scenario.baseline.type === 'v4-scaffold') {
      runV4Baseline({
        initialVersion: scenario.baseline.initialVersion,
        database,
        multiplier,
      });
    } else if (scenario.baseline.type === 'v5-pinned') {
      runV5PinnedBaseline({
        initialVersion: scenario.baseline.initialVersion,
        database,
        multiplier,
      });
    } else {
      throw new Error(`Unknown baseline type: ${scenario.baseline.type}`);
    }

    for (const stage of scenario.stages) {
      console.log(`\n── Stage: ${stage.id} (${stage.type}) ──`);
      if (stage.type === 'strapi-pinned') {
        runStrapiPinnedStage({ version: stage.version, database });
      } else if (stage.type === 'workspace') {
        runWorkspaceStage({ stage, database, multiplier, dataOrigin });
      } else {
        throw new Error(`Unknown stage type: ${stage.type}`);
      }
    }

    console.log(`\n✅ Migration test "${scenario.id}" completed successfully.`);
  } finally {
    teardown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
