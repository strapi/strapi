// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  runInServer,
  scaffoldContentType,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';

import { setupApp, type TestApp } from '../../helpers';

let ctx: TestApp;

const hasTable = (table: string) =>
  runInServer<boolean>(ctx.server, 'v4-self-ref-compat', 'hasTable', { table });

describe('v4-self-ref-compat', () => {
  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-v4-self-ref',
      scaffold(app) {
        // `test` in the old suite: a content type routed at /api/tests hides the test plugin
        scaffoldContentType(app, {
          singularName: 'self-ref-test',
          pluralName: 'self-ref-tests',
          attributes: {
            children: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::self-ref-test.self-ref-test',
              inversedBy: 'parents',
            },
            parents: {
              type: 'relation',
              relation: 'manyToMany',
              target: 'api::self-ref-test.self-ref-test',
              inversedBy: 'children', // intentionally wrong to validate retro compatibility
            },
          },
        });
        scaffoldServerScript(app, path.join(__dirname, 'server/v4-self-ref-compat.js'));
      },
    });
  });

  afterAll(stopAllServers);

  test('2 tables are created', async () => {
    const hasFirstTable = await hasTable('self_ref_tests_children_lnk');
    const hasSecondTable = await hasTable('self_ref_tests_parents_lnk');

    expect(hasFirstTable).toBe(true);
    expect(hasSecondTable).toBe(true);
  });
});
