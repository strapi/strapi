'use strict';

/**
 * Spike (CMS-1943): test-only plugin that restores a SQLite snapshot through a worker reload.
 *
 * POST /api/tests/reset writes a marker and calls strapi.reload(). The develop primary process
 * kills this worker (strapi.destroy() closes the DB) and forks a new one. The new worker runs
 * this register() before bootstrap opens the DB, copies the snapshot over the DB file, and
 * removes the marker.
 */

const fs = require('node:fs');
const path = require('node:path');

// Resolve from the test app (cwd), like the app's own code does.
const dts = require(require.resolve('@strapi/data-transfer', { paths: [process.cwd()] }));

const BOOTED_AT = Date.now();

const isEnabled = () => process.env.STRAPI_TEST_PLUGIN === 'true';

const paths = (strapi) => {
  const dbFile = strapi.config.get('database.connection.connection.filename');
  const tmpDir = path.dirname(dbFile);

  return {
    dbFile,
    snapshot: process.env.STRAPI_TEST_SNAPSHOT || path.join(tmpDir, 'snapshot.db'),
    marker: path.join(tmpDir, 'restore-pending'),
    dtsDir: path.join(tmpDir, 'snapshot-dts'),
  };
};

const restoreSnapshot = (strapi) => {
  const { dbFile, snapshot, marker } = paths(strapi);

  if (!fs.existsSync(marker)) {
    return;
  }

  const start = process.hrtime.bigint();
  for (const suffix of ['-wal', '-shm', '-journal']) {
    fs.rmSync(`${dbFile}${suffix}`, { force: true });
  }
  fs.copyFileSync(snapshot, dbFile);
  fs.rmSync(marker, { force: true });
  const ms = Number(process.hrtime.bigint() - start) / 1e6;

  strapi.log.info(`[tests] restored ${path.basename(snapshot)} in ${ms.toFixed(1)} ms`);
};

const isLoopback = (ip = '') => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);

module.exports = {
  register({ strapi }) {
    if (!isEnabled()) {
      return;
    }

    restoreSnapshot(strapi);
  },

  routes: {
    'content-api': {
      type: 'content-api',
      routes: [
        {
          method: 'GET',
          path: '/boot',
          handler: 'tests.boot',
          config: { auth: false },
        },
        {
          method: 'POST',
          path: '/snapshot',
          handler: 'tests.snapshot',
          config: { auth: false },
        },
        {
          method: 'POST',
          path: '/restore-sql',
          handler: 'tests.restoreSql',
          config: { auth: false },
        },
        {
          method: 'POST',
          path: '/export-dts',
          handler: 'tests.exportDts',
          config: { auth: false },
        },
        {
          method: 'POST',
          path: '/restore-dts',
          handler: 'tests.restoreDts',
          config: { auth: false },
        },
        {
          method: 'POST',
          path: '/reset',
          handler: 'tests.reset',
          config: { auth: false },
        },
      ],
    },
  },

  controllers: {
    tests: ({ strapi }) => ({
      boot(ctx) {
        if (!isEnabled() || !isLoopback(ctx.request.ip)) {
          return ctx.notFound();
        }
        ctx.body = { pid: process.pid, bootedAt: BOOTED_AT };
      },

      // Online, consistent copy of the live DB (SQLite VACUUM INTO), e.g. after the role logins.
      async snapshot(ctx) {
        if (!isEnabled() || !isLoopback(ctx.request.ip)) {
          return ctx.notFound();
        }
        const { snapshot } = paths(strapi);
        const start = process.hrtime.bigint();
        fs.rmSync(snapshot, { force: true });
        await strapi.db.connection.raw('VACUUM INTO ?', [snapshot]);
        ctx.body = { snapshot, ms: Number(process.hrtime.bigint() - start) / 1e6 };
      },

      // D2: copy every table back from the snapshot through the live connection, no restart.
      async restoreSql(ctx) {
        if (!isEnabled() || !isLoopback(ctx.request.ip)) {
          return ctx.notFound();
        }
        const { snapshot } = paths(strapi);
        const start = process.hrtime.bigint();
        const knex = strapi.db.connection;

        await knex.raw('PRAGMA foreign_keys = OFF');
        await knex.raw('ATTACH DATABASE ? AS snap', [snapshot]);
        try {
          const tables = (
            await knex.raw(
              "SELECT name FROM snap.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
            )
          ).map((row) => row.name);
          await knex.transaction(async (trx) => {
            for (const table of tables) {
              await trx.raw(`DELETE FROM main."${table}"`);
              await trx.raw(`INSERT INTO main."${table}" SELECT * FROM snap."${table}"`);
            }
            await trx.raw('DELETE FROM main.sqlite_sequence');
            await trx.raw('INSERT INTO main.sqlite_sequence SELECT * FROM snap.sqlite_sequence');
          });
        } finally {
          await knex.raw('DETACH DATABASE snap');
          await knex.raw('PRAGMA foreign_keys = ON');
        }

        ctx.body = { ms: Number(process.hrtime.bigint() - start) / 1e6 };
      },

      // Piste 2: export the live DB as a DTS directory (the seeded state).
      async exportDts(ctx) {
        if (!isEnabled() || !isLoopback(ctx.request.ip)) {
          return ctx.notFound();
        }
        const { dtsDir } = paths(strapi);
        const start = process.hrtime.bigint();
        fs.rmSync(dtsDir, { recursive: true, force: true });
        const engine = dts.engine.createTransferEngine(
          dts.strapi.providers.createLocalStrapiSourceProvider({
            getStrapi: () => strapi,
            autoDestroy: false,
          }),
          dts.directory.providers.createLocalDirectoryDestinationProvider({
            directory: { path: dtsDir },
            file: {},
          }),
          { versionStrategy: 'ignore', schemaStrategy: 'ignore', exclude: ['files'] }
        );
        await engine.transfer();
        ctx.body = { dtsDir, ms: Number(process.hrtime.bigint() - start) / 1e6 };
      },

      // Piste 2: restore that export in process, the way reset-fixture.js restores with-admin.
      async restoreDts(ctx) {
        if (!isEnabled() || !isLoopback(ctx.request.ip)) {
          return ctx.notFound();
        }
        const { dtsDir } = paths(strapi);
        const start = process.hrtime.bigint();
        const all = Object.keys(strapi.contentTypes);
        const admin = all.filter((uid) => uid.startsWith('admin::'));
        const others = all.filter((uid) => !uid.startsWith('admin::'));

        const run = async (include, configuration) => {
          const engine = dts.engine.createTransferEngine(
            dts.directory.providers.createLocalDirectorySourceProvider({
              directory: { path: dtsDir },
            }),
            dts.strapi.providers.createLocalStrapiDestinationProvider({
              getStrapi: async () => strapi,
              autoDestroy: false,
              strategy: 'restore',
              restore: { assets: false, entities: { include }, configuration },
            }),
            { versionStrategy: 'ignore', schemaStrategy: 'ignore', exclude: ['files'] }
          );
          await engine.transfer();
        };

        await run(admin, { coreStore: false, webhook: false });
        await run(others, { coreStore: true, webhook: true });
        ctx.body = { ms: Number(process.hrtime.bigint() - start) / 1e6 };
      },

      async reset(ctx) {
        if (!isEnabled() || !isLoopback(ctx.request.ip)) {
          return ctx.notFound();
        }

        const { snapshot, marker } = paths(strapi);
        if (!fs.existsSync(snapshot)) {
          return ctx.badRequest(`No snapshot at ${snapshot}`);
        }

        fs.writeFileSync(marker, String(Date.now()));
        ctx.status = 202;
        ctx.body = { reloading: true };

        // Answer first, then reload: the worker that handles this request is about to die.
        setImmediate(() => strapi.reload());
      },
    }),
  },
};
