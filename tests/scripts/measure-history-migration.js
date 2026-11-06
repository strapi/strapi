'use strict';

/**
 * Measures the `content-manager::history-version-source-and-author` migration on a throwaway
 * database, with the history table of the previous Strapi version.
 *
 * Run it from the repo root, after `yarn test:generate-app` and a build:
 *   node tests/scripts/measure-history-migration.js --db=<sqlite|postgres|mysql> --level=<level>
 *
 * Postgres and MySQL: set DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME and DATABASE_PASSWORD
 * to a throwaway server. The user needs the right to create databases. The script drops and
 * creates the `ee273_measure` database on it. SQLite uses `test-apps/api/.tmp/ee273-measure.db`.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const dotenv = require('dotenv');
// eslint-disable-next-line import/no-extraneous-dependencies
const knex = require('knex');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/strapi');

const APP_DIR = path.resolve(__dirname, '../../test-apps/api');
const DATABASE_NAME = 'ee273_measure';
const SQLITE_FILENAME = '.tmp/ee273-measure.db';

const HISTORY_VERSION_UID = 'plugin::content-manager.history-version';
const HISTORY_TABLE = 'strapi_history_versions';
const MIGRATION_NAME = 'content-manager::history-version-source-and-author';
const NEW_ATTRIBUTES = ['source', 'authorType', 'authorName', 'authorModel', 'authorId'];
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
  tiny: { versions: 10, documents: 5, admins: 1 },
  realistic: { versions: 20_000, documents: 1_000, admins: 5 },
  bigger: { versions: 500_000, documents: 25_000, admins: 50 },
  extreme: { versions: 5_000_000, documents: 250_000, admins: 500 },
};

const SEED_SIZE = 1_000;
const COPY_CHUNK_SIZE = 10_000;
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

  return { client: args.db, level: args.level };
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

const resetDatabase = async (client) => {
  if (client === 'sqlite') {
    fs.rmSync(path.join(APP_DIR, SQLITE_FILENAME), { force: true });
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

const setDatabaseEnv = (client) => {
  dotenv.config({ path: path.join(APP_DIR, '.env') });

  process.env.DATABASE_CLIENT = client;

  if (client === 'sqlite') {
    process.env.DATABASE_FILENAME = SQLITE_FILENAME;
  } else {
    process.env.DATABASE_NAME = DATABASE_NAME;
  }
};

const toPreviousModel = (model) => ({
  ...model,
  attributes: Object.fromEntries(
    Object.entries(model.attributes).filter(([name]) => !NEW_ATTRIBUTES.includes(name))
  ),
  indexes: [],
});

const toNotNullableSourceModel = (model) => ({
  ...model,
  attributes: {
    ...model.attributes,
    source: { ...model.attributes.source, column: { notNullable: true } },
  },
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

/**
 * Loads Strapi like a server start: internal migrations, then schema sync.
 * `mapHistoryModel` changes the history model before Strapi reads it.
 */
const loadStrapi = async ({ mapHistoryModel = (model) => model, run }) => {
  const strapi = createStrapi({ appDir: APP_DIR, distDir: APP_DIR, autoReload: false });
  const models = strapi.get('models');
  const addModel = models.add.bind(models);
  const timings = {};

  models.add = (model) =>
    addModel(model.uid === HISTORY_VERSION_UID ? mapHistoryModel(model) : model);

  timeMethod(strapi.db.migrations, 'up', timings, 'migrations');
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
  const admins = Array.from({ length: count }, (_, index) => {
    // Cover each rule of the display name: username, then first and last name, then email.
    const nameRule = index % 3;

    return {
      document_id: documentId(1_000_000 + index),
      firstname: nameRule === 0 ? null : `First${index}`,
      lastname: nameRule === 2 ? `Last${index}` : null,
      username: nameRule === 1 ? `admin${index}` : null,
      email: `admin${index}@ee273.test`,
      is_active: true,
      blocked: false,
      created_at: now,
      updated_at: now,
      published_at: now,
    };
  });

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

/* -------------------------------------------------------------------------------------------------
 * Checks
 * -----------------------------------------------------------------------------------------------*/

const countByAuthor = async (strapi) =>
  strapi.db
    .connection(HISTORY_TABLE)
    .select('created_by_id', 'source', 'author_type', 'author_name', 'author_model', 'author_id')
    .count({ count: '*' })
    .groupBy('created_by_id', 'source', 'author_type', 'author_name', 'author_model', 'author_id')
    .orderBy(['created_by_id', 'author_id']);

const countByCreatedBy = async (strapi) =>
  strapi.db
    .connection(HISTORY_TABLE)
    .select('created_by_id')
    .count({ count: '*' })
    .groupBy('created_by_id')
    .orderBy('created_by_id');

const getAdminName = ({ username, firstname, lastname, email }) => {
  if (username) return username;
  if (firstname) return `${firstname} ${lastname ?? ''}`.trim();
  return email;
};

const checkMigratedRows = async (strapi, createdByBefore) => {
  const admins = await strapi.db
    .connection('admin_users')
    .select('id', 'username', 'firstname', 'lastname', 'email');
  const adminsById = new Map(admins.map((admin) => [admin.id, admin]));
  const groups = await countByAuthor(strapi);
  const errors = [];

  for (const group of groups) {
    if (group.source !== 'admin-panel') {
      errors.push(`source is ${group.source} for ${group.count} rows`);
    }

    if (group.created_by_id === null) {
      if (group.author_type !== null) {
        errors.push(`a deleted admin has an author on ${group.count} rows`);
      }

      continue;
    }

    const admin = adminsById.get(group.created_by_id);
    const isExpectedAuthor =
      group.author_type === 'person' &&
      group.author_name === getAdminName(admin) &&
      group.author_model === 'admin::user' &&
      group.author_id === String(admin.id);

    if (!isExpectedAuthor) {
      errors.push(`admin ${group.created_by_id} has a wrong author on ${group.count} rows`);
    }
  }

  const createdByAfter = await countByCreatedBy(strapi);

  if (JSON.stringify(createdByAfter) !== JSON.stringify(createdByBefore)) {
    errors.push('created_by_id changed');
  }

  return { errors, groups };
};

const getHistoryTable = async (strapi) => {
  const { tables } = await strapi.db.dialect.schemaInspector.getSchema();

  return tables.find((table) => table.name === HISTORY_TABLE);
};

const getHistoryTableIndexes = async (strapi) =>
  (await getHistoryTable(strapi)).indexes.map(
    (index) => `${index.name} (${index.columns.join(', ')})`
  );

const isSourceNullable = async (strapi) => {
  const { columns } = await getHistoryTable(strapi);

  return !columns.find((column) => column.name === 'source').notNullable;
};

/* -------------------------------------------------------------------------------------------------
 * Main
 * -----------------------------------------------------------------------------------------------*/

const forgetMigration = (strapi) =>
  strapi.db.connection('strapi_migrations_internal').where('name', MIGRATION_NAME).delete();

const main = async () => {
  const { client, level } = parseArgs();
  const report = { client, level, ...LEVELS[level] };

  setDatabaseEnv(client);
  await resetDatabase(client);

  // 1. Create the schema of the previous Strapi version, then fill it.
  const start = performance.now();
  const { result: createdByBefore } = await loadStrapi({
    mapHistoryModel: toPreviousModel,
    async run(strapi) {
      await forgetMigration(strapi);
      const adminIds = await createAdmins(strapi, LEVELS[level].admins);
      await fillVersions(strapi, LEVELS[level], adminIds);

      return countByCreatedBy(strapi);
    },
  });
  report.fillMs = Math.round(performance.now() - start);

  // 2. Start Strapi on this branch: the migration, then the schema sync.
  const firstRun = await loadStrapi({
    async run(strapi) {
      const result = {
        ...(await checkMigratedRows(strapi, createdByBefore)),
        indexes: await getHistoryTableIndexes(strapi),
      };

      await forgetMigration(strapi);

      return result;
    },
  });
  report.migrationMs = firstRun.timings.migrations;
  report.schemaSyncMs = firstRun.timings.schemaSync;
  report.indexes = firstRun.result.indexes;
  report.errors = firstRun.result.errors;

  // 3. Run the migration a second time: it must change nothing.
  const rerun = await loadStrapi({
    run: async (strapi) => ({
      ...(await checkMigratedRows(strapi, createdByBefore)),
      sameRows:
        JSON.stringify(await countByAuthor(strapi)) === JSON.stringify(firstRun.result.groups),
    }),
  });
  report.secondMigrationMs = rerun.timings.migrations;
  report.errors.push(...rerun.result.errors);
  if (!rerun.result.sameRows) {
    report.errors.push('the second run changed rows');
  }

  // 4. The schema sync that `NOT NULL` on `source` would run.
  const notNullRun = await loadStrapi({
    mapHistoryModel: toNotNullableSourceModel,
    run: async (strapi) => ({ isSourceNullable: await isSourceNullable(strapi) }),
  });
  report.notNullSchemaSyncMs = notNullRun.timings.schemaSync;
  if (notNullRun.result.isSourceNullable) {
    report.errors.push('source is still nullable');
  }

  console.log(JSON.stringify(report));
};

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
