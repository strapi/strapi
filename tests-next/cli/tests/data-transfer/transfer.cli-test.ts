import fs from 'node:fs';
import path from 'node:path';

import {
  TEST_TRANSFER_TOKEN_ACCESS_KEY,
  buildAdmin,
  resetDatabase,
  startServer,
  stopAllServers,
  type App,
  type Database,
} from '@strapi/tests-shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp, port, runStrapi, worker } from '../helpers';
import {
  ARTICLE,
  CATEGORY,
  UPLOAD_FILE,
  exportApp,
  mediaContent,
  ofType,
  scaffoldContentTypes,
  seedContent,
} from './fixture';

let local: App;
let remote: App;
let database: Database;

/**
 * Run `strapi transfer` in the local app, from or to the remote served for this transfer only. The
 * remote stops whatever happens, so a failure doesn't keep its port for the next test.
 */
const transfer = async (direction: 'from' | 'to') => {
  // The transfer WebSocket route needs the admin build: without it, the admin panel route
  // fails on the missing index.html and closes the connection.
  const server = await startServer(remote, { port, database, requireAdmin: true });
  try {
    const res = await fetch(`${server.url}/api/tests/transfer-token`, { method: 'POST' });
    expect(res.status).toBe(200);

    const url = `${server.url}/admin`;
    const result = await runStrapi(
      local,
      [
        'transfer',
        `--${direction}`,
        url,
        `--${direction}-token`,
        TEST_TRANSFER_TOKEN_ACCESS_KEY,
        '--force',
      ],
      // A transfer of this fixture takes about a second.
      { database, timeout: 20_000 }
    );
    const logs = `${result.output}\n--- remote server\n${server.logs().slice(-5000)}`;
    expect(result.code, logs).toBe(0);
  } finally {
    await server.stop();
  }
};

/** The upload records of an app, and the content of their files in public/uploads. */
const uploads = async (app: App, exportName: string) => {
  const { entities } = await exportApp(app, database, exportName);
  return {
    articles: ofType(entities, ARTICLE).length,
    categories: ofType(entities, CATEGORY).length,
    files: ofType(entities, UPLOAD_FILE)
      .map(({ data }) => ({
        name: data.name as string,
        hash: data.hash as string,
        size: data.size as number,
        content: fs.readFileSync(
          path.join(app.dir, 'public', 'uploads', `${data.hash}${data.ext}`),
          'utf8'
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
};

/** What `seedContent` creates, with its media files named `<prefix><index>.txt`. */
const expectSeededContent = (content: Awaited<ReturnType<typeof uploads>>, prefix: string) => {
  expect(content.articles).toBe(3);
  expect(content.categories).toBe(2);
  expect(content.files.map(({ name, content: text }) => ({ name, text }))).toEqual([
    { name: `${prefix}0.txt`, text: mediaContent(0) },
    { name: `${prefix}1.txt`, text: mediaContent(1) },
  ]);
};

describe('transfer', () => {
  beforeAll(async () => {
    ({ app: local, database } = await createApp(scaffoldContentTypes));
    ({ app: remote } = await createApp(scaffoldContentTypes, { name: `cli-${worker}-remote` }));
    await buildAdmin(remote);
  });

  afterAll(async () => {
    await stopAllServers();
  });

  it('pulls the content and the media of a remote Strapi', async () => {
    await resetDatabase(local, database);
    await resetDatabase(remote, database);
    await seedContent(remote, database, { mediaPrefix: 'remote-' });
    const source = await uploads(remote, 'pull-source');

    await transfer('from');

    const destination = await uploads(local, 'pull-destination');
    expectSeededContent(destination, 'remote-');
    expect(destination.files).toEqual(source.files);
  });

  it('pushes the content and the media to a remote Strapi', async () => {
    await resetDatabase(local, database);
    await resetDatabase(remote, database);
    await seedContent(local, database, { mediaPrefix: 'local-' });
    const source = await uploads(local, 'push-source');

    await transfer('to');

    const destination = await uploads(remote, 'push-destination');
    expectSeededContent(destination, 'local-');
    expect(destination.files).toEqual(source.files);
  });
});
