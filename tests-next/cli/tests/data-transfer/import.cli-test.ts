import path from 'node:path';

import type { App, Database } from '@strapi/tests-shared';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp, runStrapi } from '../helpers';
import {
  ARTICLE,
  CATEGORY,
  UPLOAD_FILE,
  UPLOAD_TYPES,
  exportApp,
  ofType,
  scaffoldContentTypes,
  seedContent,
  type ExportContent,
} from './fixture';

let app: App;
let database: Database;

/** What the import tests compare: the seeded content, by type. */
const counts = ({ entities }: ExportContent) => ({
  articles: ofType(entities, ARTICLE).length,
  categories: ofType(entities, CATEGORY).length,
  files: ofType(entities, UPLOAD_FILE).length,
});

const seeded = { articles: 3, categories: 2, files: 2 };

const ids = (content: ExportContent, type: string) =>
  ofType(content.entities, type).map((entity) => entity.id);

let exportCount = 0;

/** What the database holds now, read through a folder export. */
const snapshot = () => {
  exportCount += 1;
  return exportApp(app, database, `snapshot-${exportCount}`);
};

const strapi = (args: string[], input?: string) => runStrapi(app, args, { database, input });

const exportArchive = async (name: string, ...args: string[]) => {
  const result = await strapi(['export', '--no-encrypt', '--no-compress', '-f', name, ...args]);
  expect(result.code, result.output).toBe(0);
  return path.join(app.dir, `${name}.tar`);
};

const importFrom = async (file: string, ...args: string[]) => {
  const result = await strapi(['import', '-f', file, '--force', ...args]);
  expect(result.code, result.output).toBe(0);
  expect(result.stdout).toMatch(/Import process has been completed successfully/);
  return result;
};

/**
 * The import restores the seeded content. It deletes the entries and creates them again, so new
 * article ids tell an import from a run that changed nothing.
 */
const expectImported = (before: ExportContent, after: ExportContent) => {
  expect(counts(after)).toEqual(seeded);
  expect(ids(after, ARTICLE)).not.toEqual(ids(before, ARTICLE));
};

describe('import', () => {
  let archive: string;

  beforeAll(async () => {
    ({ app, database } = await createApp(scaffoldContentTypes));
    await seedContent(app, database);
    archive = await exportArchive('output');
  });

  describe('without --force', () => {
    it('stops when the user does not confirm', async () => {
      const before = await snapshot();

      const result = await strapi(['import', '-f', archive], 'n\n');

      expect(result.code).toBe(1);
      expect(result.stdout).toContain('The import will delete your existing data!');
      expect(result.stderr).toContain('Import process aborted');
      expect(ids(await snapshot(), ARTICLE)).toEqual(ids(before, ARTICLE));
    });

    it('imports when the user confirms', async () => {
      const before = await snapshot();

      const result = await strapi(['import', '-f', archive], 'y\n');

      expect(result.code, result.output).toBe(0);
      expect(result.stdout).toMatch(/Import process has been completed successfully/);
      expectImported(before, await snapshot());
    });
  });

  it('restores the same content after an export and an import', async () => {
    const before = await snapshot();
    const file = await exportArchive('roundtrip');
    expect(counts(await snapshot())).toEqual(counts(before));

    await importFrom(file);

    expectImported(before, await snapshot());
  });

  it('imports a folder export', async () => {
    const result = await strapi(['export', '--format', 'dir', '--no-encrypt', '-f', 'dir-export']);
    expect(result.code, result.output).toBe(0);
    const before = await snapshot();

    await importFrom(path.join(app.dir, 'dir-export'));

    expectImported(before, await snapshot());
  });

  // #25008
  it('imports an export without the Media Library and keeps the existing upload records', async () => {
    const filters = ['--exclude', 'files', '--exclude-content-types', UPLOAD_TYPES.join(',')];
    const file = await exportArchive('no-media', ...filters);
    const before = await snapshot();

    await importFrom(file, ...filters);

    const after = await snapshot();
    expectImported(before, after);
    expect(ids(after, UPLOAD_FILE)).toEqual(ids(before, UPLOAD_FILE));
  });

  it('imports only the listed content types and keeps the others', async () => {
    const file = await exportArchive('only-articles', '--only-content-types', ARTICLE);
    const before = await snapshot();

    await importFrom(file, '--only-content-types', ARTICLE);

    const after = await snapshot();
    expectImported(before, after);
    expect(ids(after, CATEGORY)).toEqual(ids(before, CATEGORY));
    expect(ids(after, UPLOAD_FILE)).toEqual(ids(before, UPLOAD_FILE));
  });

  it('keeps the Media Library records when importing an export made with --exclude files', async () => {
    const file = await exportArchive('no-files', '--exclude', 'files');
    const before = await snapshot();

    await importFrom(file, '--exclude', 'files');

    expectImported(before, await snapshot());
  });
});
