'use strict';

/**
 * Measures the history upgrade on a throwaway database, from the history table of the previous
 * Strapi version: the schema sync that adds the source and author columns, then the hook that
 * clears the author id of the versions when an admin is deleted.
 *
 * Run it from the repo root, after `yarn test:generate-app` and a build:
 *   node tests/scripts/measure-history-upgrade.js --db=<sqlite|postgres|mysql> --level=<level>
 *
 * Postgres and MySQL: set DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME and DATABASE_PASSWORD
 * to a throwaway server. The user needs the right to create databases. The script drops and
 * creates the `ee273_measure` database on it.
 * SQLite: the script deletes and creates the file of `--sqlite-file` (default: in the OS temp
 * folder). Keep it outside `test-apps/`, which `yarn test:api` deletes.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');
const dotenv = require('dotenv');
// eslint-disable-next-line import/no-extraneous-dependencies
const knex = require('knex');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/strapi');

const APP_DIR = path.resolve(__dirname, '../../test-apps/api');
const DATABASE_NAME = 'ee273_measure';
const DEFAULT_SQLITE_FILE = path.join(os.tmpdir(), 'ee273-measure.db');

const HISTORY_VERSION_UID = 'plugin::content-manager.history-version';
const HISTORY_TABLE = 'strapi_history_versions';
const NEW_ATTRIBUTES = ['source', 'authorType', 'authorModel', 'authorId'];
const COPIED_COLUMNS = [
  'content_type',
  'related_document_id',
  'locale',
  'status',
  'data',
  'schema',
  'created_at',
  'created_by_id',
];

const LEVELS = {
  tiny: { versions: 10, documents: 5, admins: 2 },
  realistic: { versions: 20_000, documents: 1_000, admins: 5 },
  bigger: { versions: 500_000, documents: 25_000, admins: 50 },
  extreme: { versions: 5_000_000, documents: 250_000, admins: 500 },
};

const SEED_SIZE = 1_000;
const COPY_CHUNK_SIZE = 10_000;
const SAMPLE_SIZE = 1_000;
const TOKENS_PER_ADMIN = 10;
// One version in 10 belongs to a deleted admin: its `created_by_id` is null.
const DELETED_ADMIN_RATIO = 10;

const parseArgs = () => {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('='))
  );

  if (!['sqlite', 'postgres', 'mysql'].includes(args.db)) {
    throw new Error('Use --db=sqlite, --db=postgres or --db=mysql');
  }

  if (!LEVELS[args.level]) {
    throw new Error(`Use --level=${Object.keys(LEVELS).join('|')}`);
  }

  return {
    client: args.db,
    level: args.level,
    sqliteFile: path.resolve(args['sqlite-file'] ?? DEFAULT_SQLITE_FILE),
  };
};

const createServerConnection = (client) => {
  const connection = {
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  };

  if (client === 'postgres') {
    return knex({ client: 'pg', connection: { ...connection, database: 'postgres' } });
  }

  return knex({ client: 'mysql2', connection });
};

const resetDatabase = async (client, sqliteFile) => {
  if (client === 'sqlite') {
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(`${sqliteFile}${suffix}`, { force: true });
    }
    return;
  }

  const server = createServerConnection(client);

  try {
    await server.raw(
      client === 'postgres'
        ? 'DROP DATABASE IF EXISTS ?? WITH (FORCE)'
        : 'DROP DATABASE IF EXISTS ??',
      [DATABASE_NAME]
    );
    await server.raw('CREATE DATABASE ??', [DATABASE_NAME]);
  } finally {
    await server.destroy();
  }
};

const setDatabaseEnv = (client, sqliteFile) => {
  dotenv.config({ path: path.join(APP_DIR, '.env') });

  process.env.DATABASE_CLIENT = client;

  if (client === 'sqlite') {
    // The test app joins the file name to its own folder
    process.env.DATABASE_FILENAME = path.relative(APP_DIR, sqliteFile);
  } else {
    process.env.DATABASE_NAME = DATABASE_NAME;
  }
};

const toPreviousModel = (model) => ({
  ...model,
  attributes: Object.fromEntries(
    Object.entries(model.attributes).filter(([name]) => !NEW_ATTRIBUTES.includes(name))
  ),
});

const timeMethod = (target, methodName, timings, label) => {
  const method = target[methodName].bind(target);

  target[methodName] = async (...args) => {
    const start = performance.now();

    try {
      return await method(...args);
    } finally {
      timings[label] = Math.round(performance.now() - start);
    }
  };
};

const time = async (callback) => {
  const start = performance.now();
  const result = await callback();

  return { ms: Math.round(performance.now() - start), result };
};

/**
 * Loads Strapi like a server start, with the schema sync.
 * `mapHistoryModel` changes the history model before Strapi reads it.
 */
const loadStrapi = async ({ mapHistoryModel = (model) => model, run }) => {
  const strapi = createStrapi({ appDir: APP_DIR, distDir: APP_DIR, autoReload: false });
  const models = strapi.get('models');
  const addModel = models.add.bind(models);
  const timings = {};

  models.add = (model) =>
    addModel(model.uid === HISTORY_VERSION_UID ? mapHistoryModel(model) : model);

  timeMethod(strapi.db.schema, 'syncSchema', timings, 'schemaSync');

  try {
    await strapi.load();

    return { timings, result: run ? await run(strapi) : undefined };
  } finally {
    await strapi.destroy();
  }
};

/* -------------------------------------------------------------------------------------------------
 * Data
 * -----------------------------------------------------------------------------------------------*/

const WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut ' +
  'labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris ' +
  'nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse ' +
  'cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui ' +
  'officia deserunt mollit anim id est laborum'
).split(' ');

const createRandom = (seed) => {
  let state = seed;

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const random = createRandom(273);
const pick = (items) => items[Math.floor(random() * items.length)];
const sentence = (length) => Array.from({ length }, () => pick(WORDS)).join(' ');
const documentId = (index) => `doc${String(index).padStart(21, '0')}`;

const ARTICLE_SCHEMA = {
  kind: 'collectionType',
  collectionName: 'articles',
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: { draftAndPublish: true },
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', required: true, pluginOptions: { i18n: { localized: true } } },
    slug: { type: 'uid', targetField: 'title' },
    description: { type: 'text', maxLength: 300, pluginOptions: { i18n: { localized: true } } },
    content: { type: 'blocks', pluginOptions: { i18n: { localized: true } } },
    cover: { type: 'media', multiple: false, allowedTypes: ['images', 'files', 'videos'] },
    author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
    categories: { type: 'relation', relation: 'manyToMany', target: 'api::category.category' },
    seo: { type: 'component', repeatable: false, component: 'shared.seo' },
    readingTime: { type: 'integer', min: 1 },
    featured: { type: 'boolean', default: false },
  },
  __schemaVersion: 'b0e2a8f0c7d4e1f6a9b3c5d7e2f4a6b8c1d3e5f7',
};

const createArticleData = (index, document) => ({
  id: index + 1,
  documentId: documentId(document),
  title: sentence(8),
  slug: sentence(5).replace(/ /g, '-'),
  description: sentence(30),
  content: Array.from({ length: 4 }, () => ({
    type: 'paragraph',
    children: [{ type: 'text', text: sentence(40) }],
  })),
  cover: {
    id: document,
    documentId: documentId(document + 1),
    name: `${sentence(2).replace(/ /g, '-')}.jpg`,
    url: `/uploads/${sentence(2).replace(/ /g, '_')}_${document}.jpg`,
    mime: 'image/jpeg',
    width: 1920,
    height: 1080,
  },
  author: { id: document % 20, documentId: documentId(document % 20), name: sentence(2) },
  categories: [{ id: 1, documentId: documentId(1), name: sentence(1) }],
  seo: { id: index + 1, metaTitle: sentence(6), metaDescription: sentence(20) },
  readingTime: 1 + (index % 15),
  featured: index % 7 === 0,
  locale: 'en',
  createdAt: new Date(Date.UTC(2025, 0, 1) + index * 60_000).toISOString(),
  updatedAt: new Date(Date.UTC(2025, 0, 1) + index * 60_000).toISOString(),
  publishedAt: null,
});

const createAdmins = async (strapi, count) => {
  const now = new Date();
  const admins = Array.from({ length: count }, (_, index) => ({
    document_id: documentId(1_000_000 + index),
    firstname: `First${index}`,
    lastname: `Last${index}`,
    email: `admin${index}@ee273.test`,
    is_active: true,
    blocked: false,
    created_at: now,
    updated_at: now,
    published_at: now,
  }));

  await strapi.db.connection.batchInsert('admin_users', admins, 100);

  return strapi.db.connection('admin_users').orderBy('id').pluck('id');
};

const fillVersions = async (strapi, { versions, documents }, adminIds) => {
  const connection = strapi.db.connection;
  const seedSize = Math.min(versions, SEED_SIZE);

  const seed = Array.from({ length: seedSize }, (_, index) => {
    const document = index % documents;
    const isDeletedAdmin = index % DELETED_ADMIN_RATIO === DELETED_ADMIN_RATIO - 1;
    const previousAdminRows = index - Math.floor((index + 1) / DELETED_ADMIN_RATIO);
    const createdById = isDeletedAdmin ? null : adminIds[previousAdminRows % adminIds.length];

    return {
      content_type: 'api::article.article',
      related_document_id: documentId(document),
      locale: 'en',
      status: pick(['draft', 'published', 'modified']),
      data: JSON.stringify(createArticleData(index, document)),
      schema: JSON.stringify(ARTICLE_SCHEMA),
      created_at: new Date(Date.UTC(2025, 0, 1) + index * 60_000),
      created_by_id: createdById,
    };
  });

  await connection.batchInsert(HISTORY_TABLE, seed, 100);

  // Copy the seed inside the database: far faster than sending millions of rows.
  let count = seedSize;

  while (count < versions) {
    const chunkSize = Math.min(versions - count, count, COPY_CHUNK_SIZE);

    await connection.raw(
      'INSERT INTO ?? (??) SELECT ?? FROM (SELECT ?? FROM ?? ORDER BY ?? LIMIT ?) seed',
      [
        HISTORY_TABLE,
        COPIED_COLUMNS,
        COPIED_COLUMNS,
        COPIED_COLUMNS,
        HISTORY_TABLE,
        'id',
        chunkSize,
      ]
    );

    count += chunkSize;
  }
};

const getTableSize = async (strapi, client, sqliteFile) => {
  const connection = strapi.db.connection;

  switch (client) {
    case 'postgres': {
      const { rows } = await connection.raw('SELECT pg_total_relation_size(?::regclass) AS size', [
        HISTORY_TABLE,
      ]);
      return Number(rows[0].size);
    }
    case 'mysql': {
      await connection.raw('ANALYZE TABLE ??', [HISTORY_TABLE]);
      const [rows] = await connection.raw(
        'SELECT data_length + index_length AS size FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
        [HISTORY_TABLE]
      );
      return Number(rows[0].size);
    }
    default:
      return fs.statSync(sqliteFile).size;
  }
};

/* -------------------------------------------------------------------------------------------------
 * Checks
 * -----------------------------------------------------------------------------------------------*/

const countByCreatedBy = async (strapi) =>
  strapi.db
    .connection(HISTORY_TABLE)
    .select('created_by_id')
    .count({ count: '*' })
    .groupBy('created_by_id')
    .orderBy('created_by_id');

const countRows = async (query) => Number((await query.count({ count: '*' }).first()).count);

const checkUpgradedRows = async (strapi, createdByBefore) => {
  const connection = strapi.db.connection;
  const errors = [];

  const rowsWithOrigin = await countRows(
    connection(HISTORY_TABLE)
      .whereNotNull('source')
      .orWhereNotNull('author_type')
      .orWhereNotNull('author_model')
      .orWhereNotNull('author_id')
  );

  if (rowsWithOrigin > 0) {
    errors.push(`${rowsWithOrigin} rows have a source or an author`);
  }

  if (JSON.stringify(await countByCreatedBy(strapi)) !== JSON.stringify(createdByBefore)) {
    errors.push('created_by_id changed');
  }

  // The legacy adapter reads `source` and `createdBy` through the query engine
  const sample = await strapi.db.query(HISTORY_VERSION_UID).findMany({
    select: ['id', 'source'],
    populate: { createdBy: { select: ['id'] } },
    orderBy: 'id',
    limit: SAMPLE_SIZE,
  });
  const storedRows = await connection(HISTORY_TABLE)
    .select('id', 'created_by_id')
    .orderBy('id')
    .limit(SAMPLE_SIZE);
  const createdByIds = new Map(storedRows.map((row) => [row.id, row.created_by_id]));

  for (const version of sample) {
    if (
      version.source !== null ||
      (version.createdBy?.id ?? null) !== createdByIds.get(version.id)
    ) {
      errors.push(`version ${version.id} reads a wrong source or createdBy`);
    }
  }

  return errors;
};

const getHistoryTableIndexes = async (strapi) => {
  const { tables } = await strapi.db.dialect.schemaInspector.getSchema();

  return tables
    .find((table) => table.name === HISTORY_TABLE)
    .indexes.map((index) => `${index.name} (${index.columns.join(', ')})`);
};

/* -------------------------------------------------------------------------------------------------
 * Delete hook
 * -----------------------------------------------------------------------------------------------*/

const countAuthorRows = (strapi, model, id) =>
  countRows(strapi.db.connection(HISTORY_TABLE).where({ author_model: model, author_id: id }));

/**
 * Deletes the admin through the query engine, which runs the database lifecycles
 */
const measureAdminDelete = async (strapi, id, errors) => {
  const rows = await countAuthorRows(strapi, 'admin::user', String(id));
  const { ms } = await time(() => strapi.db.query('admin::user').delete({ where: { id } }));

  // The hook fails open: check that it cleared the author id
  const rowsLeft = await countAuthorRows(strapi, 'admin::user', String(id));
  if (rowsLeft > 0) {
    errors.push(`the delete of admin ${id} left its id on ${rowsLeft} rows`);
  }

  return { rows, ms };
};

const measureDeleteHook = async (strapi) => {
  const connection = strapi.db.connection;
  const errors = [];

  const [typicalAdminId] = await connection('admin_users').orderBy('id').pluck('id');
  const heavyAutomationAdmin = await strapi.db.query('admin::user').create({
    data: { firstname: 'Heavy', lastname: 'Automation', email: 'heavy@ee273.test' },
  });

  // Give the versions an author like new versions have: the rows of the first admin stay theirs,
  // all the other rows of a live admin go to the heavy automation admin
  const setup = await time(() =>
    connection(HISTORY_TABLE)
      .whereNotNull('created_by_id')
      .update({
        source: 'admin-panel',
        author_type: 'person',
        author_model: 'admin::user',
        author_id: connection.raw('CASE WHEN ?? = ? THEN ? ELSE ? END', [
          'created_by_id',
          typicalAdminId,
          String(typicalAdminId),
          String(heavyAutomationAdmin.id),
        ]),
      })
  );

  const typicalAdmin = await measureAdminDelete(strapi, typicalAdminId, errors);

  // Run the update of the token hook once for each token of an admin
  const tokens = await time(async () => {
    for (let id = 1; id <= TOKENS_PER_ADMIN; id += 1) {
      await strapi.db.query(HISTORY_VERSION_UID).updateMany({
        where: { authorModel: 'admin::api-token', authorId: String(id) },
        data: { authorId: null },
      });
    }
  });

  const heavyAutomation = await measureAdminDelete(strapi, heavyAutomationAdmin.id, errors);

  return {
    authorSetupMs: setup.ms,
    typicalAdminRows: typicalAdmin.rows,
    typicalAdminDeleteMs: typicalAdmin.ms,
    tokensDeleteMs: tokens.ms,
    heavyAutomationRows: heavyAutomation.rows,
    heavyAutomationDeleteMs: heavyAutomation.ms,
    errors,
  };
};

/* -------------------------------------------------------------------------------------------------
 * Main
 * -----------------------------------------------------------------------------------------------*/

const main = async () => {
  const { client, level, sqliteFile } = parseArgs();
  const report = { client, level, ...LEVELS[level] };

  setDatabaseEnv(client, sqliteFile);
  await resetDatabase(client, sqliteFile);

  // 1. Create the schema of the previous Strapi version, then fill it.
  const fill = await time(() =>
    loadStrapi({
      mapHistoryModel: toPreviousModel,
      async run(strapi) {
        const adminIds = await createAdmins(strapi, LEVELS[level].admins);
        await fillVersions(strapi, LEVELS[level], adminIds);

        return {
          createdBy: await countByCreatedBy(strapi),
          tableSize: await getTableSize(strapi, client, sqliteFile),
        };
      },
    })
  );
  const previous = fill.result.result;
  report.fillMs = fill.ms;
  report.tableSizeMb = Math.round(previous.tableSize / 1_048_576);

  // 2. Start Strapi on this branch: the schema sync adds the columns.
  const upgrade = await loadStrapi({
    run: async (strapi) => ({
      errors: await checkUpgradedRows(strapi, previous.createdBy),
      indexes: await getHistoryTableIndexes(strapi),
    }),
  });
  report.schemaSyncMs = upgrade.timings.schemaSync;
  report.indexes = upgrade.result.indexes;
  report.errors = upgrade.result.errors;

  // 3. Delete authors: the hook clears their id on the versions.
  const deletes = await loadStrapi({ run: measureDeleteHook });
  const { errors, ...deleteTimings } = deletes.result;
  Object.assign(report, deleteTimings);
  report.errors.push(...errors);

  console.log(JSON.stringify(report));
};

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
