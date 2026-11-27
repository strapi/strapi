import fs from 'node:fs';
import path from 'node:path';

import {
  scaffoldContentType,
  seedApp,
  startServer,
  stopAllServers,
  type App,
  type Database,
} from '@strapi/tests-shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp, port, runStrapi } from '../helpers';

let app: App;
let database: Database;

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

const schemaFile = (name: string) =>
  path.join(app.dir, 'src', 'api', name, 'content-types', name, 'schema.json');

const migrationsDir = () => path.join(app.dir, 'database', 'migrations');

const renameMigrations = () =>
  fs.existsSync(migrationsDir())
    ? fs.readdirSync(migrationsDir()).filter((file) => file.endsWith('.rename-fields.js'))
    : [];

const renameField = async (uid: string, oldName: string, newName: string) => {
  const result = await runStrapi(app, ['rename:field', uid, oldName, newName], { database });
  expect(result.code, result.output).toBe(0);
  return result;
};

describe('rename:field', () => {
  beforeAll(async () => {
    ({ app, database } = await createApp((generated) => {
      scaffoldContentType(generated, {
        singularName: 'dog',
        attributes: { age: { type: 'integer' } },
      });
      scaffoldContentType(generated, {
        singularName: 'article',
        attributes: {
          title: { type: 'string' },
          slug: { type: 'uid', targetField: 'title' },
        },
      });
      scaffoldContentType(generated, {
        singularName: 'cat',
        attributes: { lives: { type: 'integer' } },
      });
    }));
  });

  afterAll(async () => {
    await stopAllServers();
  });

  it('renames a scalar attribute in the schema and generates a data-preserving migration', async () => {
    const before = new Set(renameMigrations());

    const { stdout } = await renameField('api::dog.dog', 'age', 'ageInYears');

    const { attributes } = readJson(schemaFile('dog'));
    expect(attributes).toHaveProperty('ageInYears');
    expect(attributes).not.toHaveProperty('age');

    // Exactly one rename migration, which renames the column through the guarded database
    // helper (the fresh-database safety lives in the helper, not in the file).
    const created = renameMigrations().filter((file) => !before.has(file));
    expect(created).toHaveLength(1);
    expect(fs.readFileSync(path.join(migrationsDir(), created[0]), 'utf8')).toContain(
      "db.schema.renameColumn(knex, { table: 'dogs', from: 'age', to: 'age_in_years' })"
    );

    expect(stdout).toMatch(/Renamed "age" to "ageInYears" on api::dog\.dog/);
    expect(stdout).toMatch(/Generated migration/);
  });

  it('keeps a uid field attached to the field it is generated from', async () => {
    expect(readJson(schemaFile('article')).attributes.slug.targetField).toBe('title');

    await renameField('api::article.article', 'title', 'heading');

    const { attributes } = readJson(schemaFile('article'));
    expect(attributes).toHaveProperty('heading');
    expect(attributes).not.toHaveProperty('title');
    expect(attributes.slug.targetField).toBe('heading');
  });

  it('keeps the data: the migration renames the column on the next boot', async () => {
    const { apiTokens } = await seedApp(
      app,
      {
        entries: [{ uid: 'api::cat.cat', data: { lives: 9 } }],
        apiTokens: [{ name: 'reader', type: 'read-only' }],
      },
      { database }
    );

    await renameField('api::cat.cat', 'lives', 'livesLeft');

    const server = await startServer(app, { port, database });
    const res = await fetch(`${server.url}/api/cats`, {
      headers: { authorization: `Bearer ${apiTokens[0].accessKey}` },
    });

    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toEqual([expect.objectContaining({ livesLeft: 9 })]);
    expect(data[0]).not.toHaveProperty('lives');
  });
});
