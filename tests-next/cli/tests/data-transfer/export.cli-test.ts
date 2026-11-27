import path from 'node:path';

import type { App, Database } from '@strapi/tests-shared';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp, parseTable, runStrapi, strapiVersion } from '../helpers';
import {
  ARTICLE,
  CATEGORY,
  UPLOAD_FILE,
  UPLOAD_TYPES,
  countByType,
  extractArchive,
  ofType,
  readExport,
  scaffoldContentTypes,
  seedContent,
  type ExportContent,
} from './fixture';

let app: App;
let database: Database;

const exportTo = (name: string, ...args: string[]) =>
  runStrapi(app, ['export', '-f', name, ...args], { database });

/** Export to an uncompressed, unencrypted archive, then read it. */
const exportArchive = async (name: string, ...args: string[]) => {
  const result = await exportTo(name, '--no-encrypt', '--no-compress', ...args);
  expect(result.code, result.output).toBe(0);
  return { result, content: readExport(await extractArchive(path.join(app.dir, `${name}.tar`))) };
};

const expectNoMediaLibrary = ({ entities, links, assets }: ExportContent) => {
  expect(assets).toEqual({ metadata: [], uploads: [] });
  expect(entities.filter((entity) => UPLOAD_TYPES.includes(entity.type))).toEqual([]);
  expect(
    links.filter(
      (link) => UPLOAD_TYPES.includes(link.left.type) || UPLOAD_TYPES.includes(link.right.type)
    )
  ).toEqual([]);
  expect(ofType(entities, ARTICLE)).toHaveLength(3);
};

describe('export', () => {
  beforeAll(async () => {
    ({ app, database } = await createApp(scaffoldContentTypes));
    await seedContent(app, database);
  });

  it('exports to an archive, with a summary table', async () => {
    const { result, content } = await exportArchive('output');

    const rows = parseTable(result.stdout);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Type: `-- ${ARTICLE}`, Count: '3' }),
        expect.objectContaining({ Type: `-- ${CATEGORY}`, Count: '2' }),
        expect.objectContaining({ Type: `-- ${UPLOAD_FILE}`, Count: '2' }),
      ])
    );
    expect(Number(rows.find((row) => row.Type === 'Total')?.Count)).toBeGreaterThan(0);
    expect(result.stdout).toContain('Export process has been completed successfully');

    expect(content.metadata.createdAt).toEqual(expect.any(String));
    expect(content.metadata.strapi.version).toBe(strapiVersion());
    expect(content.schemas.length).toBeGreaterThan(0);
    expect(countByType(content.entities)).toMatchObject({
      [ARTICLE]: 3,
      [CATEGORY]: 2,
      [UPLOAD_FILE]: 2,
    });
    expect(content.assets.uploads).toHaveLength(2);
  });

  it('exports to a folder with --format dir', async () => {
    const result = await exportTo('dir-export', '--format', 'dir', '--no-encrypt');
    expect(result.code, result.output).toBe(0);

    const content = readExport(path.join(app.dir, 'dir-export'));
    expect(content.metadata.strapi.version).toBe(strapiVersion());
    expect(content.schemas.length).toBeGreaterThan(0);
    expect(countByType(content.entities)).toMatchObject({ [ARTICLE]: 3, [CATEGORY]: 2 });
  });

  it('refuses --format dir without --no-encrypt', async () => {
    const result = await exportTo('dir-without-flag', '--format', 'dir');

    expect(result.code).not.toBe(0);
    expect(result.output).toMatch(/require --no-encrypt/i);
  });

  // #25008
  it('excludes the Media Library with --exclude files and --exclude-content-types', async () => {
    const { content } = await exportArchive(
      'no-media',
      '--exclude',
      'files',
      '--exclude-content-types',
      UPLOAD_TYPES.join(',')
    );

    expectNoMediaLibrary(content);
  });

  // #25008
  it('excludes the Media Library with --exclude media-library', async () => {
    const { content } = await exportArchive('no-media-preset', '--exclude', 'media-library');

    expectNoMediaLibrary(content);
  });

  it('exports only the listed content types with --only-content-types', async () => {
    const { content } = await exportArchive('only-articles', '--only-content-types', ARTICLE);

    expect(Object.keys(countByType(content.entities))).toEqual([ARTICLE]);
    expect(ofType(content.entities, ARTICLE)).toHaveLength(3);
    expect(content.schemas.length).toBeGreaterThan(0);
    expect(
      content.links.every((link) => link.left.type === ARTICLE && link.right.type === ARTICLE)
    ).toBe(true);
  });

  it('keeps the Media Library records but not the files with --exclude files', async () => {
    const { result, content } = await exportArchive('no-files', '--exclude', 'files');

    expect(result.stdout).toMatch(/Media library records .* are still transferred/);
    expect(result.stdout).toMatch(/Sync upload binaries separately/);
    expect(content.assets).toEqual({ metadata: [], uploads: [] });
    expect(ofType(content.entities, UPLOAD_FILE)).toHaveLength(2);
  });
});
