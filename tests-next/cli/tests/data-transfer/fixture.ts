import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { scaffoldContentType, seedApp, type App, type Database } from '@strapi/tests-shared';
import { expect } from 'vitest';

import { runStrapi } from '../helpers';

export const ARTICLE = 'api::article.article';
export const CATEGORY = 'api::category.category';
export const UPLOAD_FILE = 'plugin::upload.file';
export const UPLOAD_FOLDER = 'plugin::upload.folder';
export const UPLOAD_TYPES = [UPLOAD_FILE, UPLOAD_FOLDER];

/** Articles with a category and a cover: entities, relations and media to transfer. */
export const scaffoldContentTypes = (app: App) => {
  scaffoldContentType(app, {
    singularName: 'category',
    pluralName: 'categories',
    attributes: { name: { type: 'string' } },
  });
  scaffoldContentType(app, {
    singularName: 'article',
    attributes: {
      title: { type: 'string' },
      category: { type: 'relation', relation: 'manyToOne', target: CATEGORY },
      cover: { type: 'media', multiple: false, allowedTypes: ['files'] },
    },
  });
};

/**
 * The content of the `index`-th media file. Every line differs, and it spans several transfer
 * chunks, so a transfer that drops or reorders a chunk changes it.
 */
export const mediaContent = (index: number) =>
  Array.from({ length: 4000 }, (_, line) => `file ${index} line ${line}`).join('\n');

/** Write `count` text files to `dir`. Returns their paths. */
const writeMediaFiles = (dir: string, count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => {
    const file = path.join(dir, `${prefix}${index}.txt`);
    fs.writeFileSync(file, mediaContent(index));
    return file;
  });

/**
 * Seed media, then entries that use them: 2 files, 2 categories and 3 articles. A seed plan can't
 * reference what it creates, hence two seeds (one boot each).
 */
export const seedContent = async (
  app: App,
  database: Database,
  { mediaPrefix = 'media-' } = {}
) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tests-transfer-media-'));
  try {
    const { media, entries: categories } = await seedApp(
      app,
      {
        media: writeMediaFiles(dir, 2, mediaPrefix).map((file) => ({ file })),
        entries: [
          { uid: CATEGORY, data: { name: 'News' } },
          { uid: CATEGORY, data: { name: 'Tech' } },
        ],
      },
      { database }
    );

    await seedApp(
      app,
      {
        entries: [
          {
            uid: ARTICLE,
            data: { title: 'First', category: categories[0].documentId, cover: media[0].id },
          },
          {
            uid: ARTICLE,
            data: { title: 'Second', category: categories[1].documentId, cover: media[1].id },
          },
          { uid: ARTICLE, data: { title: 'Third', category: categories[0].documentId } },
        ],
      },
      { database }
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

export interface Entity {
  type: string;
  id: number;
  data: Record<string, unknown>;
}

export interface Link {
  left: { type: string };
  right: { type: string };
}

/** An export in the `dir` format, or an extracted archive. */
export interface ExportContent {
  metadata: { createdAt: string; strapi: { version: string } };
  schemas: string[];
  entities: Entity[];
  links: Link[];
  /** Files under assets/metadata and assets/uploads. */
  assets: { metadata: string[]; uploads: string[] };
}

const list = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

const readJsonl = <T>(dir: string): T[] =>
  list(dir)
    .filter((file) => file.endsWith('.jsonl'))
    .flatMap((file) =>
      fs
        .readFileSync(path.join(dir, file), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as T)
    );

export const readExport = (dir: string): ExportContent => ({
  metadata: JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8')),
  schemas: list(path.join(dir, 'schemas')).filter((file) => file.endsWith('.jsonl')),
  entities: readJsonl<Entity>(path.join(dir, 'entities')),
  links: readJsonl<Link>(path.join(dir, 'links')),
  assets: {
    metadata: list(path.join(dir, 'assets', 'metadata')),
    uploads: list(path.join(dir, 'assets', 'uploads')),
  },
});

/** Extract an uncompressed, unencrypted export archive next to it. Returns the folder. */
export const extractArchive = async (file: string) => {
  const dir = `${file}.extracted`;
  fs.mkdirSync(dir, { recursive: true });
  await promisify(execFile)('tar', ['-xf', file, '-C', dir]);
  return dir;
};

/** Export an app to a folder (`--format dir`), to read what its database holds. */
export const exportApp = async (app: App, database: Database, name: string) => {
  const result = await runStrapi(app, ['export', '--format', 'dir', '--no-encrypt', '-f', name], {
    database,
  });
  expect(result.code, result.output).toBe(0);
  return readExport(path.join(app.dir, name));
};

export const ofType = (entities: Entity[], type: string) =>
  entities.filter((entity) => entity.type === type);

export const countByType = (entities: Entity[]) =>
  entities.reduce<Record<string, number>>(
    (counts, { type }) => ({ ...counts, [type]: (counts[type] ?? 0) + 1 }),
    {}
  );
