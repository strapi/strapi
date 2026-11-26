import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { runInServer, scaffoldServerScript, stopAllServers } from '@strapi/tests-shared';

import { setupApp, type TestApp } from '../../helpers';

let ctx: TestApp;

const isKnexQuery = (args: Record<string, unknown>) =>
  runInServer<boolean>(ctx.server, 'knex-utils', 'isKnexQuery', args);

describe('knex', () => {
  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-knex-utils',
      scaffold(app) {
        scaffoldServerScript(app, path.join(__dirname, 'server/knex-utils.js'));
      },
    });
  });

  afterAll(stopAllServers);

  describe('isKnexQuery', () => {
    test('knex query: true', async () => {
      const res = await isKnexQuery({ kind: 'query' });
      expect(res).toBe(true);
    });

    test('knex raw: true', async () => {
      const res = await isKnexQuery({ kind: 'raw' });
      expect(res).toBe(true);
    });

    test.each([[''], [{}], [[]], [2], [new Date()]])('%s: false', async (value) => {
      const res = await isKnexQuery({ kind: 'value', value, isDate: value instanceof Date });
      expect(res).toBe(false);
    });
  });
});
