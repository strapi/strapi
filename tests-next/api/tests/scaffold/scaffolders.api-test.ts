import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  databaseFromEnv,
  generateApp,
  readScaffoldedConfig,
  resetDatabase,
  scaffoldComponent,
  scaffoldConfig,
  scaffoldContentType,
  scaffoldPlugin,
  seed,
  startServer,
  stopAllServers,
  type App,
  type Server,
} from '@strapi/tests-shared';

import { port, request, worker } from '../helpers';

const database = databaseFromEnv();

let app: App;
let server: Server;
let token: string;

beforeAll(async () => {
  app = await generateApp({ name: `api-scaffold-${worker}` });
  await resetDatabase(app, database);

  // Everything is written before the one boot of this file.
  scaffoldComponent(app, {
    uid: 'shared.address',
    attributes: { street: { type: 'string' }, city: { type: 'string' } },
  });
  scaffoldContentType(app, {
    singularName: 'restaurant',
    attributes: {
      name: { type: 'string', required: true },
      address: { type: 'component', component: 'shared.address', repeatable: false },
    },
  });
  scaffoldContentType(app, {
    singularName: 'homepage',
    pluralName: 'homepages',
    kind: 'singleType',
    draftAndPublish: true,
    attributes: { title: { type: 'string' } },
  });
  scaffoldConfig(app, 'api', { rest: { defaultLimit: 2 } });
  scaffoldConfig(app, 'api', { rest: { maxLimit: 50 } });
  scaffoldConfig(app, 'features', { future: { adminTokens: true } });
  scaffoldPlugin(app, 'users-permissions', { config: { jwt: { expiresIn: '1h' } } });

  server = await startServer(app, { port, database });

  const { apiTokens } = await seed(server, { apiTokens: [{ name: 'full', type: 'full-access' }] });
  token = apiTokens[0].accessKey;
});

afterAll(async () => {
  await stopAllServers();
});

describe('scaffoldContentType and scaffoldComponent', () => {
  test('a collection type with a component gets its Content API routes', async () => {
    await seed(server, {
      entries: ['Chez Paul', 'Le Bistrot', 'La Cantine'].map((name) => ({
        uid: 'api::restaurant.restaurant',
        data: { name, address: { street: '1 rue de Paris', city: 'Paris' } },
      })),
    });

    const res = await request(server, '/api/restaurants?populate=address&sort=name', { token });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2); // api.rest.defaultLimit, scaffolded below
    expect(res.body.meta.pagination.total).toBe(3);
    expect(res.body.data[0]).toMatchObject({
      name: 'Chez Paul',
      address: { street: '1 rue de Paris', city: 'Paris' },
    });
  });

  test('a single type with draft and publish', async () => {
    const put = await request(server, '/api/homepage?status=published', {
      method: 'PUT',
      token,
      body: { data: { title: 'Welcome' } },
    });
    expect(put.status).toBe(200);

    const res = await request(server, '/api/homepage', { token });
    expect(res.body.data).toMatchObject({ title: 'Welcome' });
  });

  test('rejects names Strapi would not load', () => {
    expect(() => scaffoldContentType(app, { singularName: 'BadName', attributes: {} })).toThrow(
      'kebab-case'
    );
    expect(() => scaffoldComponent(app, { uid: 'address', attributes: {} })).toThrow(
      '<category>.<name>'
    );
  });
});

describe('scaffoldConfig and scaffoldPlugin', () => {
  test('calls on the same file merge', async () => {
    const res = await request(server, '/api/tests/config?path=api.rest');
    expect(res.body.value).toMatchObject({ defaultLimit: 2, maxLimit: 50 });
  });

  test('boot-time config, such as a future flag, applies', async () => {
    const res = await request(server, '/api/tests/features');
    expect(res.body.future).toMatchObject({ adminTokens: true });
  });

  test('plugin config applies', async () => {
    const res = await request(server, '/api/tests/config?path=plugin::users-permissions.jwt');
    expect(res.body.value).toMatchObject({ expiresIn: '1h' });
  });

  test('arrays replace instead of merging', () => {
    // Not in the app: `strapi develop` restarts when a config file changes.
    const offline: App = { ...app, dir: fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-')) };
    scaffoldConfig(offline, 'custom', { list: [1, 2, 3], nested: { a: 1 } });
    scaffoldConfig(offline, 'custom', { list: [4], nested: { b: 2 } });

    expect(readScaffoldedConfig(offline, 'custom')).toEqual({
      list: [4],
      nested: { a: 1, b: 2 },
    });
  });
});
