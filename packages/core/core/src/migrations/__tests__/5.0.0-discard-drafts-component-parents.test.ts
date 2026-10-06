import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Database } from '@strapi/database';

import { createLocalizationService } from '../../services/localization';
import { transformContentTypesToModels } from '../../utils/transform-content-types-to-models';
import { discardDocumentDrafts } from '../database/5.0.0-discard-drafts';

/**
 * discard-drafts copies a published entry's components to its new draft, except components whose
 * owning parent (another component, possibly nested) sits under a draft & publish entry. Resolving
 * that parent must not cost one query per component instance per candidate parent table.
 */

const PAGE_UID = 'api::page.page';
const POST_UID = 'api::post.post';
const SECTION_UID = 'shared.section';
const BLOCK_UID = 'shared.block';
const QUOTE_UID = 'shared.quote';

// columns every v5 content type table has by the time discard-drafts runs
const systemAttributes = {
  locale: { type: 'string' },
  createdAt: { type: 'datetime' },
  updatedAt: { type: 'datetime' },
  publishedAt: { type: 'datetime' },
};

const contentTypes: Record<string, any> = {
  [PAGE_UID]: {
    uid: PAGE_UID,
    modelType: 'contentType',
    modelName: 'page',
    collectionName: 'pages',
    options: { draftAndPublish: true },
    attributes: {
      title: { type: 'string' },
      blocks: { type: 'component', component: BLOCK_UID, repeatable: true },
      sections: { type: 'component', component: SECTION_UID, repeatable: true },
      ...systemAttributes,
    },
  },
  [POST_UID]: {
    uid: POST_UID,
    modelType: 'contentType',
    modelName: 'post',
    collectionName: 'posts',
    options: { draftAndPublish: false },
    attributes: {
      title: { type: 'string' },
      blocks: { type: 'component', component: BLOCK_UID, repeatable: true },
      locale: { type: 'string' },
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
    },
  },
};

const components: Record<string, any> = {
  [SECTION_UID]: {
    uid: SECTION_UID,
    modelType: 'component',
    modelName: 'section',
    collectionName: 'components_shared_sections',
    attributes: {
      name: { type: 'string' },
      blocks: { type: 'component', component: BLOCK_UID, repeatable: true },
      quote: { type: 'component', component: QUOTE_UID },
    },
  },
  [BLOCK_UID]: {
    uid: BLOCK_UID,
    modelType: 'component',
    modelName: 'block',
    collectionName: 'components_shared_blocks',
    attributes: {
      text: { type: 'string' },
    },
  },
  [QUOTE_UID]: {
    uid: QUOTE_UID,
    modelType: 'component',
    modelName: 'quote',
    collectionName: 'components_shared_quotes',
    attributes: {
      text: { type: 'string' },
    },
  },
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-discard-drafts-component-parents-'));
let dbCount = 0;

const createDatabase = async () => {
  // the sqlite dialect resolves the filename to a path, so ':memory:' would become a file on disk
  dbCount += 1;
  const db = new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: path.join(tmpDir, `migration-${dbCount}.db`) },
      useNullAsDefault: true,
    },
    settings: {
      runMigrations: false,
      migrations: { dir: path.join(tmpDir, 'migrations') },
    },
  } as any);

  const models = transformContentTypesToModels(
    [...Object.values(contentTypes), ...Object.values(components)],
    db.metadata.identifiers
  );

  await db.init({ models });
  await db.schema.create();

  // the migration probes optional models (e.g. the upload plugin's file model); this test app
  // does not load them, so answer "not registered" instead of throwing
  const getMetadata = db.metadata.get.bind(db.metadata);
  db.metadata.get = ((uid: string) => (db.metadata.has(uid) ? getMetadata(uid) : null)) as any;

  global.strapi = {
    log: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
    getModel: (uid: string) => contentTypes[uid] ?? components[uid],
    contentTypes,
    components,
    plugins: {},
    db,
    localization: createLocalizationService(),
  } as any;

  return db;
};

const now = Date.now();

// sqlite caps a multi-row insert at 500 rows
const insertRows = async (db: Database, table: string, rows: Array<Record<string, unknown>>) => {
  for (let i = 0; i < rows.length; i += 100) {
    await db.connection(table).insert(rows.slice(i, i + 100));
  }
};

const blockRow = (cmpId: number, order: number) => ({
  entity_id: 1,
  cmp_id: cmpId,
  component_type: BLOCK_UID,
  field: 'blocks',
  order,
});

/**
 * One published page holding:
 * - `blocks`:   block 1 (only on the page) and block 3, which is ALSO nested in section 1
 * - `sections`: section 1, which nests blocks 2 and 3
 * Plus `extraBlocks` more blocks directly on the page, to measure query growth. The last of them
 * is also nested in section 1, so it is resolved by the last id chunk and must be filtered.
 */
const seed = async (db: Database, extraBlocks = 0) => {
  await insertRows(db, 'pages', [
    {
      id: 1,
      document_id: 'page-doc-1',
      title: 'Published page',
      published_at: now,
      created_at: now,
      updated_at: now,
    },
  ]);

  const blockCount = 3 + extraBlocks;
  await insertRows(
    db,
    'components_shared_blocks',
    Array.from({ length: blockCount }, (_, i) => ({ id: i + 1, text: `block ${i + 1}` }))
  );
  await insertRows(db, 'components_shared_sections', [{ id: 1, name: 'section 1' }]);

  const pageBlockIds = [1, 3, ...Array.from({ length: extraBlocks }, (_, i) => 4 + i)];
  await insertRows(db, 'pages_cmps', [
    ...pageBlockIds.map((cmpId, order) => blockRow(cmpId, order + 1)),
    { entity_id: 1, cmp_id: 1, component_type: SECTION_UID, field: 'sections', order: 1 },
  ]);

  await insertRows(db, 'components_shared_sections_cmps', [
    blockRow(2, 1),
    blockRow(3, 2),
    ...(extraBlocks > 0 ? [blockRow(blockCount, 3)] : []),
  ]);
};

const runMigration = async (db: Database) => {
  await db.connection.transaction(async (trx) => {
    await discardDocumentDrafts.up(trx, db);
  });
};

const getDraftPageComponents = async (db: Database) => {
  const knex = db.connection;
  const draft = await knex('pages').whereNull('published_at').first();
  const rows = await knex('pages_cmps').where({ entity_id: draft.id }).orderBy(['field', 'order']);
  return { draft, rows };
};

describe('5.0.0-discard-drafts migration — component parent resolution', () => {
  let db: Database;

  afterEach(async () => {
    await db?.connection.destroy();
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies page-owned components to the draft and skips one also nested under a draft & publish parent', async () => {
    db = await createDatabase();
    await seed(db);

    await runMigration(db);

    const { draft, rows } = await getDraftPageComponents(db);
    expect(draft).toBeDefined();

    const blockRows = rows.filter((row: any) => row.field === 'blocks');
    const sectionRows = rows.filter((row: any) => row.field === 'sections');

    // block 1 is copied as a fresh clone; block 3 is filtered because its parent chain
    // (section 1 -> published page) has draft & publish
    expect(blockRows).toHaveLength(1);
    expect(blockRows[0].cmp_id).not.toBe(1);
    const clonedBlock = await db
      .connection('components_shared_blocks')
      .where({ id: blockRows[0].cmp_id })
      .first();
    expect(clonedBlock.text).toBe('block 1');

    // section 1 is cloned together with its two nested blocks
    expect(sectionRows).toHaveLength(1);
    const nested = await db
      .connection('components_shared_sections_cmps')
      .where({ entity_id: sectionRows[0].cmp_id })
      .orderBy('order');
    expect(nested).toHaveLength(2);
    const nestedTexts = await db
      .connection('components_shared_blocks')
      .whereIn(
        'id',
        nested.map((row: any) => row.cmp_id)
      )
      .orderBy('id');
    expect(nestedTexts.map((row: any) => row.text)).toEqual(['block 2', 'block 3']);
  });

  it('resolves a parent like the per-instance lookup: candidate order, component type, lowest join row', async () => {
    db = await createDatabase();

    // page blocks:   1, 3, 4, 5; page section: section 1
    // section 1:     blocks 2, 3, 4 and quote 1 (same id as block 1, different component type)
    // section 2:     block 5, in a join row older than block 5's row under section 1;
    //                section 2 itself is not attached to any entry
    // post 1:        block 4 (posts have no draft & publish and are tried before sections)
    await insertRows(db, 'pages', [
      {
        id: 1,
        document_id: 'page-doc-1',
        title: 'Published page',
        published_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);
    await insertRows(db, 'posts', [
      { id: 1, document_id: 'post-doc-1', title: 'Post', created_at: now, updated_at: now },
    ]);
    await insertRows(
      db,
      'components_shared_blocks',
      [1, 2, 3, 4, 5].map((id) => ({ id, text: `block ${id}` }))
    );
    await insertRows(db, 'components_shared_sections', [
      { id: 1, name: 'section 1' },
      { id: 2, name: 'section 2' },
    ]);
    await insertRows(db, 'components_shared_quotes', [{ id: 1, text: 'quote 1' }]);

    await insertRows(db, 'pages_cmps', [
      blockRow(1, 1),
      blockRow(3, 2),
      blockRow(4, 3),
      blockRow(5, 4),
      { entity_id: 1, cmp_id: 1, component_type: SECTION_UID, field: 'sections', order: 1 },
    ]);
    await insertRows(db, 'components_shared_sections_cmps', [
      { ...blockRow(5, 1), entity_id: 2 },
      blockRow(2, 1),
      blockRow(3, 2),
      blockRow(4, 3),
      { entity_id: 1, cmp_id: 1, component_type: QUOTE_UID, field: 'quote', order: 1 },
      blockRow(5, 4),
    ]);
    await insertRows(db, 'posts_cmps', [blockRow(4, 1)]);

    await runMigration(db);

    const { rows } = await getDraftPageComponents(db);
    const blockRows = rows.filter((row: any) => row.field === 'blocks');
    const texts = await db
      .connection('components_shared_blocks')
      .whereIn(
        'id',
        blockRows.map((row: any) => row.cmp_id)
      )
      .orderBy('text')
      .pluck('text');

    // block 1: the section join row with cmp_id 1 is a quote, not a block -> no parent, kept
    // block 3: nested in section 1, which sits on the published page -> filtered
    // block 4: first found in posts_cmps (no draft & publish), before components_shared_sections_cmps -> kept
    // block 5: its lowest join row is under section 2, which has no draft & publish parent -> kept
    expect(texts).toEqual(['block 1', 'block 4', 'block 5']);
  });

  it('does not issue one parent lookup per component instance', async () => {
    db = await createDatabase();
    // more than one id chunk (250 on sqlite) per candidate table
    const extraBlocks = 600;
    await seed(db, extraBlocks);

    const parentTables = ['components_shared_sections_cmps', 'posts_cmps'];
    const parentLookups: string[] = [];
    db.connection.on('query', (query: { sql: string }) => {
      // identifier quoting differs per dialect (backticks on sqlite), so match bare names
      const sql = query.sql.toLowerCase();
      if (
        sql.startsWith('select') &&
        sql.includes('cmp_id') &&
        parentTables.some((table) => sql.includes(table))
      ) {
        parentLookups.push(query.sql);
      }
    });

    await runMigration(db);

    // 602 block instances on the page, two candidate parent tables for `shared.block`:
    // a per-instance lookup would issue ~1200 queries
    expect(parentLookups.length).toBeGreaterThan(0);
    expect(parentLookups.length).toBeLessThan(20);

    // blocks 3 and the last extra block are nested in section 1 and filtered
    const { rows } = await getDraftPageComponents(db);
    expect(rows.filter((row: any) => row.field === 'blocks')).toHaveLength(extraBlocks);
  });
});
