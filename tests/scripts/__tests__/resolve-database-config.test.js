'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  createGenerateArgsParser,
  databases,
  resolveDatabaseConfig,
} = require('../database-config');

const parse = (args) => createGenerateArgsParser(args).parse();

describe('API test app database selection', () => {
  it('uses CI postgres flags instead of the sqlite positional default', () => {
    const argv = parse([
      '--appPath=test-apps/api',
      '--dbclient=postgres',
      '--dbhost=localhost',
      '--dbport=5432',
      '--dbname=strapi_test',
      '--dbusername=strapi',
      '--dbpassword=strapi',
    ]);

    assert.equal(argv.databaseName, 'sqlite');
    assert.equal(argv.appPath, 'test-apps/api');
    assert.deepEqual(resolveDatabaseConfig(argv), {
      client: 'postgres',
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'strapi_test',
        username: 'strapi',
        password: 'strapi',
        filename: undefined,
      },
    });
  });

  it('uses CI mysql flags instead of the sqlite positional default', () => {
    const argv = parse([
      '--appPath=test-apps/api',
      '--dbclient=mysql',
      '--dbhost=localhost',
      '--dbport=3306',
      '--dbname=strapi_test',
      '--dbusername=strapi',
      '--dbpassword=strapi',
    ]);

    assert.deepEqual(resolveDatabaseConfig(argv), {
      client: 'mysql',
      connection: {
        host: 'localhost',
        port: 3306,
        database: 'strapi_test',
        username: 'strapi',
        password: 'strapi',
        filename: undefined,
      },
    });
  });

  it('uses CI sqlite flags', () => {
    const argv = parse(['--appPath=test-apps/api', '--dbclient=sqlite', '--dbfile=./tmp/data.db']);

    assert.deepEqual(resolveDatabaseConfig(argv), {
      client: 'sqlite',
      connection: {
        host: undefined,
        port: undefined,
        database: undefined,
        username: undefined,
        password: undefined,
        filename: './tmp/data.db',
      },
      useNullAsDefault: true,
    });
  });

  it('uses a named preset from the positional argument', () => {
    const argv = parse(['postgres', '--appPath=test-apps/api']);

    assert.equal(resolveDatabaseConfig(argv), databases.postgres);
  });

  it('uses a named preset from --db when the positional default is sqlite', () => {
    const argv = parse(['--db=mysql', '--appPath=test-apps/api']);

    assert.equal(argv.databaseName, 'sqlite');
    assert.equal(resolveDatabaseConfig(argv), databases.mysql);
  });

  it('defaults to the sqlite preset', () => {
    assert.equal(resolveDatabaseConfig(parse([])), databases.sqlite);
  });
});
