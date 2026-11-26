'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const {
  IDENTITY_SQL,
  extractExpectedClient,
  readGeneratedDatabaseClient,
  assertGeneratedClientMatches,
  assertDialectIdentity,
  verifyRuntimeDatabase,
  createApiTestAppLoader,
  formatRuntimeAssurance,
  redactSecrets,
} = require('../database-assurance');

const cli = path.join(__dirname, '..', 'verify-api-database-client.js');

const CI_DB_OPTIONS = {
  postgres:
    '--dbclient=postgres --dbhost=localhost --dbport=5432 --dbname=strapi_test --dbusername=strapi --dbpassword=strapi',
  mysql:
    '--dbclient=mysql --dbhost=localhost --dbport=3306 --dbname=strapi_test --dbusername=strapi --dbpassword=strapi',
  sqlite: '--dbclient=sqlite --dbfile=./tmp/data.db',
};

const messageOf = (error) => (error instanceof Error ? error.message : String(error));

describe('expected database client', () => {
  it('reads the client CI puts in DB_OPTIONS and ignores every other flag', () => {
    assert.equal(extractExpectedClient(CI_DB_OPTIONS.postgres), 'postgres');
    assert.equal(extractExpectedClient(CI_DB_OPTIONS.mysql), 'mysql');
    assert.equal(extractExpectedClient(CI_DB_OPTIONS.sqlite), 'sqlite');
  });

  it('keeps a requested postgres client when other flags name sqlite', () => {
    assert.equal(
      extractExpectedClient('--db=sqlite --dbclient=postgres --dbfile=./tmp/data.db'),
      'postgres'
    );
  });

  it('accepts the space-separated form yargs receives after shell word-splitting', () => {
    assert.equal(extractExpectedClient('--dbclient postgres --dbhost localhost'), 'postgres');
    assert.equal(extractExpectedClient("--dbclient='mysql'"), 'mysql');
    assert.equal(extractExpectedClient('--dbclient="sqlite"'), 'sqlite');
  });

  it('fails closed when --dbclient is absent, unknown, duplicated, or ambiguous', () => {
    const cases = [
      ['', /does not include --dbclient/],
      ['postgres', /does not include --dbclient/],
      ['--db=postgres --dbpassword=supersecret', /does not include --dbclient/],
      ['--dbclient', /missing a value/],
      ['--dbclient --dbhost=localhost', /missing a value/],
      ['--dbclient=', /is not one of postgres, mysql, sqlite/],
      ['--dbclient=oracle', /is not one of postgres, mysql, sqlite/],
      ['--dbclient=Postgres', /is not one of postgres, mysql, sqlite/],
      ['--dbclient=postgres --dbclient=sqlite', /multiple --dbclient/],
      ['--dbclient=postgres --dbclient postgres', /multiple --dbclient/],
      ['--dbclient=postgres --dbclient=postgres', /multiple --dbclient/],
      ['--dbclient="pos', /ambiguous quoted/],
      ['--dbclient=postgres\n--dbclient=mysql', /single line/],
    ];

    for (const [input, pattern] of cases) {
      assert.throws(() => extractExpectedClient(input), pattern);
    }

    assert.throws(() => extractExpectedClient(undefined), /must be a string/);
  });

  it('does not echo credentials when the client cannot be determined', () => {
    assert.throws(
      () => extractExpectedClient('--dbpassword=supersecret --dbname=strapi_test'),
      (error) => {
        assert.match(messageOf(error), /does not include --dbclient/);
        assert.equal(messageOf(error).includes('supersecret'), false);
        return true;
      }
    );
  });
});

describe('generated .env verification', () => {
  it('fails the historical mismatch of postgres requested and sqlite generated', () => {
    const expected = extractExpectedClient(CI_DB_OPTIONS.postgres);
    const actual = readGeneratedDatabaseClient(
      ['DATABASE_CLIENT=sqlite', 'DATABASE_PASSWORD=supersecret', 'DATABASE_USERNAME=strapi'].join(
        '\n'
      )
    );

    assert.equal(expected, 'postgres');
    assert.equal(actual, 'sqlite');
    assert.throws(
      () => assertGeneratedClientMatches(expected, actual),
      /API job requested postgres but generated test-apps\/api\/\.env has DATABASE_CLIENT=sqlite/
    );
  });

  it('accepts a matching DATABASE_CLIENT and ignores comments and secrets', () => {
    const envText = [
      '# DATABASE_CLIENT=sqlite',
      'DATABASE_PASSWORD=supersecret',
      'DATABASE_CLIENT="postgres"',
      "DATABASE_USERNAME='strapi'",
    ].join('\n');

    assert.equal(readGeneratedDatabaseClient(envText), 'postgres');
    assert.doesNotThrow(() => assertGeneratedClientMatches('postgres', 'postgres'));
  });

  it('fails closed when DATABASE_CLIENT is missing, empty, or duplicated', () => {
    assert.throws(() => readGeneratedDatabaseClient(''), /is empty/);
    assert.throws(() => readGeneratedDatabaseClient('DATABASE_HOST=localhost\n'), /found 0/);
    assert.throws(() => readGeneratedDatabaseClient('DATABASE_CLIENT=\n'), /empty DATABASE_CLIENT/);
    assert.throws(
      () => readGeneratedDatabaseClient('DATABASE_CLIENT=postgres\nDATABASE_CLIENT=mysql\n'),
      /found 2/
    );
  });
});

describe('runtime database identity', () => {
  const postgresRow = {
    database: 'strapi_test',
    version: 'PostgreSQL 16.4 (Debian 16.4-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc',
  };
  const mysqlRow = { database: 'strapi_test', version: '8.0.36' };
  const mariadbRow = {
    database: 'strapi_test',
    version: '10.11.6-MariaDB-1:10.11.6+maria~ubu2204',
  };
  const sqliteRow = { version: '3.45.1' };

  it('reads Postgres, MySQL, and SQLite Knex shapes', () => {
    assert.deepEqual(assertDialectIdentity('postgres', { rows: [postgresRow] }), {
      client: 'postgres',
      database: 'strapi_test',
      version: postgresRow.version,
    });

    const fields = [{ name: 'database' }, { name: 'version' }];
    assert.deepEqual(assertDialectIdentity('mysql', [[mysqlRow], fields]), {
      client: 'mysql',
      database: 'strapi_test',
      version: '8.0.36',
    });
    assert.deepEqual(assertDialectIdentity('mysql', [[mariadbRow], fields]), {
      client: 'mysql',
      database: 'strapi_test',
      version: mariadbRow.version,
    });

    assert.deepEqual(assertDialectIdentity('sqlite', [sqliteRow]), {
      client: 'sqlite',
      database: 'main',
      version: '3.45.1',
    });
  });

  it('normalizes driver column casing without printing a connection URL', () => {
    assert.equal(
      assertDialectIdentity('mysql', [[{ DATABASE: 'strapi_test', VERSION: '8.4.0-log' }], []])
        .version,
      '8.4.0-log'
    );

    assert.throws(
      () =>
        assertDialectIdentity('postgres', {
          rows: [
            {
              database: 'postgres://strapi:secret@localhost/strapi_test',
              version: 'PostgreSQL 16',
            },
          ],
        }),
      /not safe to print/
    );
  });

  it('rejects malformed and cross-engine identities', () => {
    const cases = [
      ['postgres', { rows: [] }, /returned 0 rows/],
      ['postgres', { rows: [postgresRow, postgresRow] }, /returned 2 rows/],
      ['postgres', null, /returned 0 rows/],
      ['postgres', { rows: [{ database: 'strapi_test', version: '3.45.1' }] }, /is not PostgreSQL/],
      [
        'postgres',
        { rows: [{ database: 'strapi_test', version: '10.11.6-MariaDB' }] },
        /is not PostgreSQL/,
      ],
      [
        'postgres',
        { rows: [{ database: '', version: 'PostgreSQL 16.4' }] },
        /current_database\(\) is empty/,
      ],
      ['mysql', [[{ database: null, version: '8.0.36' }], []], /DATABASE\(\) is empty/],
      ['mysql', [[{ database: 'strapi_test', version: '' }], []], /not MySQL-compatible/],
      [
        'mysql',
        [[{ database: 'strapi_test', version: 'PostgreSQL 16.4' }], []],
        /not MySQL-compatible/,
      ],
      ['sqlite', [{ version: '' }], /sqlite_version\(\) returned ""/],
      ['sqlite', [{ version: 'PostgreSQL 16.4' }], /sqlite_version\(\)/],
      ['mysql', [[], [{ name: 'database' }]], /returned 0 rows/],
      ['sqlite', [{ version: 'not-a-version' }], /sqlite_version\(\)/],
      ['sqlite', { rows: ['not-a-row'] }, /unexpected row/],
    ];

    for (const [client, rawResult, pattern] of cases) {
      assert.throws(() => assertDialectIdentity(client, rawResult), pattern);
    }
  });
});

describe('runtime verifier', () => {
  const fakeApp = ({ client, rawResult, loadError, destroyError, rawError }) => {
    const state = { destroyed: 0, sql: [] };
    const instance = {
      db: {
        dialect: { client },
        connection: {
          async raw(sql) {
            state.sql.push(sql);
            if (rawError) {
              throw rawError;
            }
            return rawResult;
          },
        },
      },
      async load() {
        if (loadError) {
          throw loadError;
        }
      },
      async destroy() {
        state.destroyed += 1;
        if (destroyError) {
          throw destroyError;
        }
      },
    };

    return { instance, state };
  };

  it('checks the live dialect, runs that client identity query, and always destroys', async () => {
    const shapes = [
      {
        client: 'postgres',
        rawResult: {
          rows: [
            {
              database: 'strapi_test',
              version: 'PostgreSQL 16.4 on x86_64-pc-linux-gnu, compiled by gcc',
            },
          ],
        },
      },
      {
        client: 'mysql',
        rawResult: [
          [{ database: 'strapi_test', version: '10.11.6-MariaDB' }],
          [{ name: 'version' }],
        ],
      },
      {
        client: 'sqlite',
        rawResult: [{ version: '3.45.1' }],
      },
    ];

    for (const shape of shapes) {
      const { instance, state } = fakeApp(shape);
      const identity = await verifyRuntimeDatabase({
        expected: shape.client,
        loadInstance: async () => instance,
      });

      assert.equal(state.destroyed, 1);
      assert.deepEqual(state.sql, [IDENTITY_SQL[shape.client]]);
      assert.equal(identity.client, shape.client);
      assert.match(
        formatRuntimeAssurance(identity),
        new RegExp(`^API database assurance: client=${shape.client} database=\\S+ version=.+`)
      );
      assert.equal(formatRuntimeAssurance(identity).includes('password'), false);
    }
  });

  it('fails the historical postgres request when the loaded dialect is sqlite', async () => {
    const { instance, state } = fakeApp({
      client: 'sqlite',
      rawResult: [{ version: '3.45.1' }],
    });

    await assert.rejects(
      () =>
        verifyRuntimeDatabase({
          expected: extractExpectedClient(CI_DB_OPTIONS.postgres),
          loadInstance: async () => instance,
        }),
      /API job requested postgres but the loaded API test app dialect is sqlite/
    );

    assert.equal(state.destroyed, 1);
    assert.deepEqual(state.sql, []);
  });

  it('destroys after a malformed identity and redacts query errors', async () => {
    const malformed = fakeApp({
      client: 'postgres',
      rawResult: { rows: [{ database: 'strapi_test', version: 'SQLite 3.45.1' }] },
    });

    await assert.rejects(
      () =>
        verifyRuntimeDatabase({
          expected: 'postgres',
          loadInstance: async () => malformed.instance,
        }),
      /is not PostgreSQL/
    );
    assert.equal(malformed.state.destroyed, 1);

    const queryError = fakeApp({
      client: 'mysql',
      rawResult: null,
      rawError: new Error("connect failed password=supersecret user='strapi'"),
    });

    await assert.rejects(
      () =>
        verifyRuntimeDatabase({
          expected: 'mysql',
          loadInstance: async () => queryError.instance,
        }),
      (error) => {
        assert.match(messageOf(error), /Database identity query failed for mysql/);
        assert.match(messageOf(error), /password=\[redacted\]/);
        assert.equal(messageOf(error).includes('supersecret'), false);
        return true;
      }
    );
    assert.equal(queryError.state.destroyed, 1);
  });

  it('keeps the original failure when destroy also fails, and destroys after load errors', async () => {
    const mismatch = fakeApp({
      client: 'mysql',
      destroyError: new Error('destroy failed password=supersecret'),
    });

    await assert.rejects(
      () =>
        verifyRuntimeDatabase({
          expected: 'postgres',
          loadInstance: async () => mismatch.instance,
        }),
      (error) => {
        assert.match(messageOf(error), /dialect is mysql/);
        assert.equal(messageOf(error).includes('supersecret'), false);
        assert.equal(messageOf(error).includes('destroy failed'), false);
        return true;
      }
    );
    assert.equal(mismatch.state.destroyed, 1);

    let destroyed = 0;
    await assert.rejects(
      () =>
        verifyRuntimeDatabase({
          expected: 'sqlite',
          loadInstance: async () => ({
            async load() {
              throw new Error('schema sync failed');
            },
            async destroy() {
              destroyed += 1;
            },
          }),
        }),
      /schema sync failed/
    );
    assert.equal(destroyed, 1);

    await assert.rejects(
      () =>
        verifyRuntimeDatabase({
          expected: 'sqlite',
          async loadInstance() {
            throw new Error('create failed');
          },
        }),
      /create failed/
    );
  });

  it('surfaces destroy failures after a successful identity check', async () => {
    const { instance } = fakeApp({
      client: 'sqlite',
      rawResult: [{ version: '3.45.1' }],
      destroyError: new Error('destroy failed'),
    });

    await assert.rejects(
      () =>
        verifyRuntimeDatabase({
          expected: 'sqlite',
          loadInstance: async () => instance,
        }),
      /destroy failed/
    );
  });

  it('refuses to build a loader without ENV_PATH', () => {
    assert.throws(() => createApiTestAppLoader(''), /ENV_PATH is not set/);
    assert.throws(() => createApiTestAppLoader(undefined), /ENV_PATH is not set/);
  });
});

describe('verify-api-database-client CLI', () => {
  const runCli = (args, env) =>
    execFileAsync(process.execPath, [cli, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });

  it('prints only the expected client parsed from raw DB_OPTIONS', async () => {
    const { stdout } = await runCli(['expected'], {
      DB_OPTIONS: `${CI_DB_OPTIONS.postgres}`,
    });

    assert.equal(stdout, 'API database assurance: expected client=postgres\n');
    assert.equal(stdout.includes('strapi'), false);
  });

  it('fails a generated sqlite app before Jest when postgres was requested', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-db-assurance-'));
    const envPath = path.join(directory, '.env');
    fs.writeFileSync(
      envPath,
      'DATABASE_CLIENT=sqlite\nDATABASE_PASSWORD=supersecret\nDATABASE_USERNAME=strapi\n'
    );

    try {
      await assert.rejects(
        () =>
          runCli(['generated'], {
            DB_OPTIONS: CI_DB_OPTIONS.postgres,
            ENV_PATH: envPath,
          }),
        (error) => {
          assert.equal(error.code, 1);
          assert.match(
            error.stderr,
            /API job requested postgres but generated test-apps\/api\/\.env has DATABASE_CLIENT=sqlite/
          );
          assert.equal(error.stderr.includes('supersecret'), false);
          return true;
        }
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails closed when the action omits a usable --dbclient', async () => {
    await assert.rejects(
      () =>
        runCli(['expected'], {
          DB_OPTIONS: '--dbpassword=supersecret',
        }),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /does not include --dbclient/);
        assert.equal(error.stderr.includes('supersecret'), false);
        return true;
      }
    );

    await assert.rejects(
      () => runCli(['nope'], { DB_OPTIONS: CI_DB_OPTIONS.sqlite }),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /Usage:/);
        return true;
      }
    );
  });
});

describe('redactSecrets', () => {
  it('removes password assignments and leaves the rest of the message', () => {
    assert.equal(
      redactSecrets("connect failed password=supersecret DATABASE_PASSWORD='hunter2'"),
      'connect failed password=[redacted] DATABASE_PASSWORD=[redacted]'
    );
    assert.match(
      redactSecrets('password authentication failed for user "strapi"'),
      /authentication failed/
    );
  });
});
