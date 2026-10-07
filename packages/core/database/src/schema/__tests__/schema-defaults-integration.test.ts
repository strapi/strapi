import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Database } from '../..';
import type { Model } from '../../types';

const baseModel = {
  uid: 'api::article.article',
  singularName: 'article',
  tableName: 'articles',
  attributes: {
    id: {
      type: 'increments' as const,
    },
    title: {
      type: 'string' as const,
    },
  },
} satisfies Model;

const extendedModel = {
  ...baseModel,
  attributes: {
    ...baseModel.attributes,
    isUpdated: {
      type: 'boolean' as const,
      default: false,
    },
  },
} satisfies Model;

const createDatabase = (filename: string) => {
  return new Database({
    connection: {
      client: 'sqlite',
      connection: { filename },
      useNullAsDefault: true,
    },
    settings: {
      forceMigration: true,
      runMigrations: false,
      migrations: {
        dir: path.join(__dirname, 'migrations'),
      },
    },
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
  });
};

describe('schema default backfill integration', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `strapi-15425-${Date.now()}.db`);
  });

  afterEach(() => {
    fs.rmSync(dbPath, { force: true });
  });

  it('backfills existing rows when a boolean field with default false is added', async () => {
    const dbV1 = createDatabase(dbPath);

    global.strapi = { db: dbV1 } as any;

    await dbV1.init({ models: [baseModel] });
    await dbV1.schema.create();

    const created = await dbV1.entityManager.create('api::article.article', {
      data: { title: 'Existing entry' },
    });

    expect(created?.title).toBe('Existing entry');
    expect(created?.isUpdated).toBeUndefined();

    await dbV1.destroy();

    const dbV2 = createDatabase(dbPath);

    global.strapi = { db: dbV2 } as any;

    await dbV2.init({ models: [extendedModel] });
    await dbV2.schema.syncSchema();

    const entry = await dbV2.entityManager.findOne('api::article.article', {
      where: { id: created?.id },
    });

    expect(entry?.isUpdated).toBe(false);

    await dbV2.destroy();
  });
});
