#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Migration performance benchmark runner.
 *
 * Subcommands:
 *   seed   — wipe + boot v4 + seed + snapshot (one-time, expensive)
 *   run    — restore snapshot + run v5 migrations + record timings
 *   suite  — run baseline + candidate across all 4 DBs (chained runs)
 *
 * Strapi source resolution (currently only `local` is implemented):
 *   local         — use the monorepo workspace-linked @strapi/*
 *                   To swap between branches: git checkout <branch> && yarn bench:run
 *   experimental  — install 0.0.0-experimental.<sha> into .bench-install/<ver>/
 *                   (NOT YET IMPLEMENTED — error thrown)
 *   pinned        — install a specific published version (NOT YET IMPLEMENTED)
 */

const { execSync, spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { getDatabaseEnv } = require('./db-utils');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = path.resolve(COMPLEX_DIR, '../..');
const RESULTS_DIR = path.join(COMPLEX_DIR, 'results');
const V4_PROJECT_DIR = process.env.V4_OUTSIDE_DIR
  ? path.resolve(process.cwd(), process.env.V4_OUTSIDE_DIR)
  : path.resolve(MONOREPO_ROOT, '..', 'complex-v4');

const SUPPORTED_DBS = ['postgres', 'mysql', 'mariadb', 'sqlite'];

// ─── arg parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) {
      out[arg.slice(2)] = true;
    } else {
      out[arg.slice(2)] = next;
      i += 1;
    }
  }
  return out;
}

function requireArg(args, name, fallback) {
  const v = args[name] ?? fallback;
  if (v == null || v === '') {
    console.error(`Error: --${name} is required`);
    process.exit(1);
  }
  return v;
}

// ─── environment capture ──────────────────────────────────────────────────────

function captureEnv(db) {
  const envInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: os.cpus()[0]?.model || 'unknown',
    cpuCount: os.cpus().length,
    totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
    dbEngine: db,
    dbVersion: null,
    dbHostType: db === 'sqlite' ? 'local-file' : 'local-container',
  };

  // Best-effort DB version probe — don't fail the benchmark if this breaks.
  try {
    if (db === 'sqlite') {
      // eslint-disable-next-line global-require
      const Database = require('better-sqlite3');
      envInfo.dbVersion = Database.prototype.constructor.name
        ? require('better-sqlite3/package.json').version
        : null;
    } else {
      const { runContainer } = require('./compose');
      const containerLookup = {
        postgres: ['ps', '--filter', 'name=strapi_complex_postgres', '--format', '{{.ID}}'],
        mysql: ['ps', '--filter', 'name=strapi_complex_mysql', '--format', '{{.ID}}'],
        mariadb: ['ps', '--filter', 'name=strapi_complex_mariadb', '--format', '{{.ID}}'],
      };
      const idRaw = runContainer(containerLookup[db]).trim();
      const id = idRaw.split('\n').filter(Boolean)[0];
      if (id) {
        // Force TCP (-h 127.0.0.1) for mysql/mariadb because their CLIs default
        // to a unix-socket path that doesn't exist in the official images.
        const probeCmd = {
          postgres: ['exec', id, 'psql', '-U', 'strapi', '-t', '-c', 'SHOW server_version;'],
          mysql: [
            'exec',
            id,
            'mysql',
            '-h',
            '127.0.0.1',
            '-ustrapi',
            '-pstrapi',
            '-sN',
            '-e',
            'SELECT VERSION();',
          ],
          mariadb: [
            'exec',
            id,
            'mariadb',
            '-h',
            '127.0.0.1',
            '-ustrapi',
            '-pstrapi',
            '-sN',
            '-e',
            'SELECT VERSION();',
          ],
        };
        envInfo.dbVersion = runContainer(probeCmd[db]).trim().split('\n')[0];
      }
    }
  } catch (err) {
    envInfo.dbVersionProbeError = String(err.message || err);
  }

  return envInfo;
}

function captureStrapiSource() {
  // Read @strapi/strapi version actually resolved (so `local` reports the
  // monorepo's current version + branch + sha).
  let version = null;
  try {
    // eslint-disable-next-line global-require
    version = require('@strapi/strapi/package.json').version;
  } catch {
    /* leave null */
  }

  let gitSha = null;
  let gitBranch = null;
  try {
    gitSha = execSync('git rev-parse HEAD', { cwd: MONOREPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    /* leave null */
  }
  try {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: MONOREPO_ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    /* leave null */
  }

  return {
    strapiSource: 'local',
    strapiVersion: version,
    strapiGitSha: gitSha,
    strapiGitBranch: gitBranch,
  };
}

// ─── snapshot helpers ─────────────────────────────────────────────────────────

function snapshotExists(db, name) {
  if (db === 'sqlite') {
    return fs.existsSync(path.join(COMPLEX_DIR, 'snapshots', `sqlite-${name}.db`));
  }
  return fs.existsSync(path.join(COMPLEX_DIR, 'snapshots', `${db}-${name}.sql`));
}

function restoreSnapshot(db, name) {
  const script = `db-${db}.js`;
  console.log(`Restoring ${db} snapshot "${name}"...`);
  execSync(`node ${path.join('scripts', script)} restore ${name}`, {
    cwd: COMPLEX_DIR,
    stdio: 'inherit',
  });
}

// ─── row count collection ─────────────────────────────────────────────────────

function collectRowCounts(db) {
  const script = `db-${db}.js`;
  try {
    const output = execSync(`node ${path.join('scripts', script)} check`, {
      cwd: COMPLEX_DIR,
      encoding: 'utf8',
    });
    // Parse the "Table Name | Row Count" table produced by db:check.
    const rowCounts = {};
    const lines = output.split('\n');
    let inTable = false;
    for (const line of lines) {
      if (line.includes('---|')) {
        inTable = true;
        continue;
      }
      if (!inTable) continue;
      const m = line.match(/^([^|]+?)\s*\|\s*(\d+)\s*$/);
      if (m) rowCounts[m[1].trim()] = Number(m[2]);
    }
    return rowCounts;
  } catch (err) {
    return { _error: String(err.message || err) };
  }
}

// ─── migrate-then-exit runner ─────────────────────────────────────────────────

/**
 * Spawn Strapi, wait for it to finish bootstrapping (which runs migrations),
 * then cleanly tear down. Uses the bench-hook preload to capture timings.
 */
function runMigrationsOnce(db, hookOutputPath) {
  const env = {
    ...getDatabaseEnv(db),
    STRAPI_BENCH_HOOK_OUTPUT: hookOutputPath,
    STRAPI_BENCH_HOOK_DEBUG: process.env.STRAPI_BENCH_HOOK_DEBUG || '',
    // Silence unrelated noise for cleaner logs; Strapi's own logger is still active.
    STRAPI_TELEMETRY_DISABLED: '1',
    STRAPI_DISABLE_UPDATE_NOTIFIER: '1',
  };

  // Strapi configs in examples/complex are .ts — compile them to dist/ first
  // (same path Strapi's own CLI uses via `strapi build` / `strapi develop`).
  // Then boot Strapi pointing at the compiled output.
  const script = `
    const tsUtils = require('@strapi/typescript-utils');
    const { createStrapi } = require('@strapi/strapi');
    (async () => {
      const cwd = process.cwd();
      if (await tsUtils.isUsingTypeScript(cwd)) {
        await tsUtils.compile(cwd, { configOptions: { ignoreDiagnostics: true } });
      }
      const distDir = await tsUtils.resolveOutDir(cwd);
      const app = await createStrapi({ distDir }).load();
      // Migrations ran during load(). Tear down cleanly.
      await app.destroy();
    })().catch((err) => {
      console.error('[bench] strapi boot failed:', err);
      process.exit(1);
    });
  `;

  const hookPath = path.resolve(SCRIPT_DIR, 'bench-hook.js');
  const start = performance.now();

  const result = spawnSync('node', ['--require', hookPath, '-e', script], {
    cwd: COMPLEX_DIR,
    env,
    stdio: 'inherit',
  });

  const wallMs = performance.now() - start;

  if (result.status !== 0) {
    console.error(`[bench] strapi boot exited with status ${result.status}`);
    process.exit(result.status ?? 1);
  }

  return { wallMs };
}

// ─── subcommand: run ──────────────────────────────────────────────────────────

function cmdRun(args) {
  const db = requireArg(args, 'db');
  if (!SUPPORTED_DBS.includes(db)) {
    console.error(`Error: --db must be one of: ${SUPPORTED_DBS.join(', ')}`);
    process.exit(1);
  }
  const label = requireArg(args, 'label');
  const snapshot = args.snapshot || `bench-m${args.multiplier || 1}`;
  const multiplier = Number(args.multiplier ?? 1);
  const strapiSource = args['strapi-source'] || 'local';

  if (strapiSource !== 'local') {
    console.error(
      `Error: --strapi-source=${strapiSource} is not yet implemented. Use \`local\` and swap branches with \`git checkout\` / \`gh pr checkout\`.`
    );
    process.exit(1);
  }

  if (!snapshotExists(db, snapshot)) {
    console.error(`Error: snapshot "${snapshot}" does not exist for ${db}.`);
    console.error(`Run \`yarn bench:seed --db ${db} --multiplier ${multiplier}\` first.`);
    process.exit(1);
  }

  // Ensure the results dir exists before the hook tries to write.
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  // Restore DB
  restoreSnapshot(db, snapshot);

  // Run migrations with timing hook
  const hookOut = path.join(os.tmpdir(), `strapi-bench-hook-${process.pid}-${Date.now()}.json`);
  console.log(`[bench] running migrations against ${db} (label=${label})...`);
  const { wallMs } = runMigrationsOnce(db, hookOut);

  // Ingest hook output
  let hookData = { migrations: [], instanceCount: 0 };
  if (fs.existsSync(hookOut)) {
    try {
      hookData = JSON.parse(fs.readFileSync(hookOut, 'utf8'));
    } catch (err) {
      console.error(`[bench] failed to parse hook output: ${err.message}`);
    }
    fs.unlinkSync(hookOut);
  }

  if (!hookData.migrations.length) {
    console.warn(
      '[bench] WARNING: hook captured zero migrations. Either Umzug API changed, or migrations were skipped as already-applied. Check the output below.'
    );
  }

  const totalDurationMs = hookData.migrations.reduce((a, m) => a + m.durationMs, 0);
  const rowCount = collectRowCounts(db);
  const timestamp = new Date().toISOString();

  const result = {
    timestamp,
    label,
    ...captureStrapiSource(),
    strapiSource,
    env: captureEnv(db),
    config: {
      multiplier,
      snapshot,
      seedMode: 'knex',
      hookMode: 'prototype',
    },
    rowCount,
    migrations: hookData.migrations,
    totalDurationMs,
    wallDurationMs: wallMs,
    umzugInstanceCount: hookData.instanceCount,
  };

  const outFile = path.join(RESULTS_DIR, `${db}-${label}-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');

  console.log(`\n✅ Benchmark complete.`);
  console.log(`   DB:         ${db}`);
  console.log(`   Label:      ${label}`);
  console.log(`   Migrations: ${hookData.migrations.length}`);
  console.log(`   Total:      ${totalDurationMs.toFixed(1)} ms (wall ${wallMs.toFixed(0)} ms)`);
  console.log(`   Result:     ${path.relative(COMPLEX_DIR, outFile)}`);
}

// ─── subcommand: seed ─────────────────────────────────────────────────────────

function cmdSeed(args) {
  const db = requireArg(args, 'db');
  if (!SUPPORTED_DBS.includes(db)) {
    console.error(`Error: --db must be one of: ${SUPPORTED_DBS.join(', ')}`);
    process.exit(1);
  }
  const multiplier = Number(args.multiplier ?? 1);
  const seedMode = args['seed-mode'] || 'strapi'; // knex mode is a follow-on
  const snapshotName = `bench-m${multiplier}`;

  if (seedMode !== 'strapi') {
    console.error(
      `Error: --seed-mode=${seedMode} is not yet implemented. Only \`strapi\` is available in the first iteration. The knex fast-seed path is tracked as a follow-up.`
    );
    process.exit(1);
  }

  if (!fs.existsSync(V4_PROJECT_DIR)) {
    console.error(`Error: v4 project not found at ${V4_PROJECT_DIR}. Run \`yarn setup:v4\` first.`);
    process.exit(1);
  }

  // Step 1: wipe DB (destructive; explicit per plan)
  console.log(`[bench:seed] wiping ${db}...`);
  execSync(`node ${path.join('scripts', `db-${db}.js`)} wipe`, {
    cwd: COMPLEX_DIR,
    stdio: 'inherit',
  });

  // Step 2: run v4 seed via the v4 project's seed-with-db wrapper.
  // This boots Strapi v4, which creates the schema + bootstrap data, then runs seed.js.
  console.log(`[bench:seed] seeding via Strapi v4 API (multiplier=${multiplier})...`);
  execSync(`node scripts/seed-with-db.js ${db} ${multiplier}`, {
    cwd: V4_PROJECT_DIR,
    stdio: 'inherit',
  });

  // Step 3: snapshot
  console.log(`[bench:seed] snapshotting as "${snapshotName}"...`);
  execSync(`node ${path.join('scripts', `db-${db}.js`)} snapshot ${snapshotName}`, {
    cwd: COMPLEX_DIR,
    stdio: 'inherit',
  });

  console.log(`\n✅ Seed + snapshot ready: ${db}/${snapshotName}`);
  console.log(`   Run \`yarn bench:run --db ${db} --label <label>\` to benchmark.`);
}

// ─── subcommand: suite ────────────────────────────────────────────────────────

function cmdSuite(args) {
  const multiplier = Number(args.multiplier ?? 1);
  const baselineLabel = args.baseline || 'baseline';
  const candidateLabel = args.candidate || 'candidate';
  const dbs = (args.dbs || SUPPORTED_DBS.join(',')).split(',').filter(Boolean);

  console.log(
    `[bench:suite] running ${baselineLabel} + ${candidateLabel} across ${dbs.join(', ')} @ multiplier=${multiplier}`
  );
  console.log(
    `[bench:suite] ASSUMPTION: you have already seeded each DB (\`yarn bench:seed --db <db> --multiplier ${multiplier}\`).`
  );
  console.log(
    `[bench:suite] ASSUMPTION: you switch the monorepo checkout between baseline and candidate manually BEFORE invoking this.`
  );

  for (const db of dbs) {
    if (!SUPPORTED_DBS.includes(db)) {
      console.error(`[bench:suite] skipping unknown db: ${db}`);
      continue;
    }
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[bench:suite] ${db}: running under current strapi checkout...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    // The suite subcommand runs under whatever branch is checked out. The
    // caller is responsible for sequencing baseline vs candidate runs.
    const label = args.label || baselineLabel;
    cmdRun({ db, label, multiplier, snapshot: `bench-m${multiplier}` });
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

const subcommand = process.argv[2];
const rest = process.argv.slice(3);
const args = parseArgs(rest);

switch (subcommand) {
  case 'run':
    cmdRun(args);
    break;
  case 'seed':
    cmdSeed(args);
    break;
  case 'suite':
    cmdSuite(args);
    break;
  default:
    console.error('Usage: node bench.js <run|seed|suite> [options]');
    console.error('');
    console.error('  run    --db <db> --label <label> [--multiplier <n>] [--snapshot <name>]');
    console.error('  seed   --db <db> --multiplier <n> [--seed-mode strapi|knex]');
    console.error(
      '  suite  --multiplier <n> [--dbs postgres,mysql,mariadb,sqlite] [--label <tag>]'
    );
    process.exit(1);
}
