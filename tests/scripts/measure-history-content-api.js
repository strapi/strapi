'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');
const dotenv = require('dotenv');
// eslint-disable-next-line import/no-extraneous-dependencies
const knex = require('knex');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/strapi');

const USAGE = `Usage, from the repo root, after a build and \`yarn test:generate-app:no-build\`:
  STRAPI_LICENSE=<license> node tests/scripts/measure-history-content-api.js --db=<sqlite|postgres|mysql> --level=<tiny|realistic|bigger|huge>

Postgres and MySQL: set DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME and DATABASE_PASSWORD to a
throwaway server. The script drops and creates the \`ee255_measure\` database on it.
SQLite: the script deletes and creates the file of --sqlite-file (default: in the OS temp folder).`;

const APP_DIR = path.resolve(__dirname, '../../test-apps/base');
const DATABASE_NAME = 'ee255_measure';
const DEFAULT_SQLITE_FILE = path.join(os.tmpdir(), 'ee255-measure.db');

const HISTORY_TABLE = 'strapi_history_versions';
const ARTICLE_UID = 'api::article.article';
const FLAG = 'admin.history.contentApi.enabled';

const LEVELS = {
  tiny: { versions: 10, documentVersions: 10 },
  realistic: { versions: 20_000, documentVersions: 20 },
  bigger: { versions: 500_000, documentVersions: 20 },
  huge: { versions: 5_000_000, documentVersions: 20 },
};

const ARTICLES = 10;
const WRITERS = 20;
const CATEGORIES = 10;
const WARMUP_WRITES = 20;
const MEASURED_WRITES = 1_000;
const WARMUP_LISTS = 3;
const MEASURED_LISTS = 20;
const COPY_CHUNK_SIZE = 10_000;

const parseArgs = () => {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('='))
  );

  if (!['sqlite', 'postgres', 'mysql'].includes(args.db) || !LEVELS[args.level]) {
    throw new Error(USAGE);
  }

  if (!process.env.STRAPI_LICENSE) {
    throw new Error(`Content History is an Enterprise feature: set STRAPI_LICENSE.\n${USAGE}`);
  }

  return {
    client: args.db,
    level: args.level,
    sqliteFile: path.resolve(args['sqlite-file'] ?? DEFAULT_SQLITE_FILE),
  };
};

/* -------------------------------------------------------------------------------------------------
 * Database
 * -----------------------------------------------------------------------------------------------*/

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

const dropDatabase = async (client, sqliteFile, { recreate }) => {
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

    if (recreate) {
      await server.raw('CREATE DATABASE ??', [DATABASE_NAME]);
    }
  } finally {
    await server.destroy();
  }
};

const setAppEnv = (client, sqliteFile) => {
  dotenv.config({ path: path.join(APP_DIR, '.env') });

  process.env.DATABASE_CLIENT = client;
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';

  if (client === 'sqlite') {
    process.env.DATABASE_FILENAME = path.relative(APP_DIR, sqliteFile);
  } else {
    process.env.DATABASE_NAME = DATABASE_NAME;
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

const getHistoryTableIndexes = async (strapi) => {
  const { tables } = await strapi.db.dialect.schemaInspector.getSchema();

  return tables
    .find((table) => table.name === HISTORY_TABLE)
    .indexes.map((index) => `${index.name} (${index.columns.join(', ')})`);
};

const countRows = async (query) => Number((await query.count({ count: '*' }).first()).count);

/* -------------------------------------------------------------------------------------------------
 * App
 * -----------------------------------------------------------------------------------------------*/

const writeJson = (relativePath, content) => {
  const file = path.join(APP_DIR, relativePath);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
};

const writeCoreApi = (name) => {
  for (const [folder, factory] of [
    ['controllers', 'createCoreController'],
    ['routes', 'createCoreRouter'],
    ['services', 'createCoreService'],
  ]) {
    const file = path.join(APP_DIR, 'src/api', name, folder, `${name}.js`);

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `'use strict';\n\nconst { factories } = require('@strapi/strapi');\n\nmodule.exports = factories.${factory}('api::${name}.${name}');\n`
    );
  }
};

const writeContentType = (name, { displayName, options = {}, pluginOptions, attributes }) => {
  writeJson(`src/api/${name}/content-types/${name}/schema.json`, {
    kind: 'collectionType',
    collectionName: `${name}s`,
    info: { singularName: name, pluralName: `${name}s`, displayName },
    options,
    pluginOptions,
    attributes,
  });
  writeCoreApi(name);
};

const writeComponent = (name, attributes) => {
  writeJson(`src/components/shared/${name}.json`, {
    collectionName: `components_shared_${name}s`,
    info: { displayName: name },
    attributes,
  });
};

const localized = { i18n: { localized: true } };

const writeAppFiles = () => {
  writeComponent('seo', {
    metaTitle: { type: 'string' },
    metaDescription: { type: 'text' },
  });
  writeComponent('section', {
    heading: { type: 'string' },
    body: { type: 'text' },
  });
  writeContentType('writer', {
    displayName: 'Writer',
    attributes: { name: { type: 'string' } },
  });
  writeContentType('category', {
    displayName: 'Category',
    attributes: { name: { type: 'string' } },
  });
  writeContentType('article', {
    displayName: 'Article',
    options: { draftAndPublish: true },
    pluginOptions: localized,
    attributes: {
      title: { type: 'string', required: true, pluginOptions: localized },
      slug: { type: 'uid', targetField: 'title' },
      description: { type: 'text', pluginOptions: localized },
      content: { type: 'blocks', pluginOptions: localized },
      cover: { type: 'media', multiple: false, allowedTypes: ['images'] },
      writer: { type: 'relation', relation: 'manyToOne', target: 'api::writer.writer' },
      categories: { type: 'relation', relation: 'manyToMany', target: 'api::category.category' },
      seo: { type: 'component', repeatable: false, component: 'shared.seo' },
      sections: { type: 'component', repeatable: true, component: 'shared.section' },
      readingTime: { type: 'integer' },
      featured: { type: 'boolean', default: false },
    },
  });
};

const startStrapi = async () => {
  const strapi = createStrapi({ appDir: APP_DIR, distDir: APP_DIR, autoReload: false });

  await strapi.load();
  strapi.log.level = 'warn';
  await strapi.server.listen();

  const { port } = strapi.server.httpServer.address();

  return { strapi, baseUrl: `http://127.0.0.1:${port}` };
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

const random = createRandom(255);
const pick = (items) => items[Math.floor(random() * items.length)];
const sentence = (length) => Array.from({ length }, () => pick(WORDS)).join(' ');

const createArticleData = (index, { writers, categories }) => ({
  title: sentence(8),
  description: sentence(30),
  content: Array.from({ length: 4 }, () => ({
    type: 'paragraph',
    children: [{ type: 'text', text: sentence(40) }],
  })),
  writer: writers[index % writers.length],
  categories: Array.from(
    { length: 3 },
    (_, offset) => categories[(index + offset) % categories.length]
  ),
  seo: { metaTitle: sentence(6), metaDescription: sentence(20) },
  sections: Array.from({ length: 3 }, () => ({ heading: sentence(5), body: sentence(40) })),
  readingTime: 1 + (index % 15),
  featured: index % 7 === 0,
});

const createDocuments = async (strapi, uid, count, createData) => {
  const documentIds = [];

  for (let index = 0; index < count; index += 1) {
    const { documentId } = await strapi.documents(uid).create({ data: createData(index) });
    documentIds.push(documentId);
  }

  return documentIds;
};

const seed = async (strapi) => {
  const relations = {
    writers: await createDocuments(strapi, 'api::writer.writer', WRITERS, (index) => ({
      name: `Writer ${index}`,
    })),
    categories: await createDocuments(strapi, 'api::category.category', CATEGORIES, (index) => ({
      name: `Category ${index}`,
    })),
  };
  const articles = await createDocuments(strapi, ARTICLE_UID, ARTICLES + 1, (index) =>
    createArticleData(index, relations)
  );

  return { relations, articles: articles.slice(0, ARTICLES), listedArticle: articles[ARTICLES] };
};

/* -------------------------------------------------------------------------------------------------
 * HTTP
 * -----------------------------------------------------------------------------------------------*/

const createClient =
  (baseUrl) =>
  async (url, { token, method = 'GET', body } = {}) => {
    const start = performance.now();
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    const ms = performance.now() - start;

    if (!response.ok) {
      throw new Error(`${method} ${url} answered ${response.status}: ${JSON.stringify(json)}`);
    }

    return { json, ms };
  };

const createApiToken = async (strapi) => {
  const { accessKey } = await strapi.service('admin::api-token').create({
    kind: 'content-api',
    name: 'Measurement',
    type: 'full-access',
    lifespan: null,
  });

  return accessKey;
};

const registerAdmin = async (request) => {
  const { json } = await request('/admin/register-admin', {
    method: 'POST',
    body: {
      email: 'measure@ee255.test',
      firstname: 'Measure',
      lastname: 'Admin',
      password: 'Password123',
    },
  });

  return json.data.token;
};

/* -------------------------------------------------------------------------------------------------
 * Measures
 * -----------------------------------------------------------------------------------------------*/

const round = (value) => Math.round(value * 10) / 10;

const summarize = (durations) => {
  const sorted = [...durations].sort((a, b) => a - b);
  const percentile = (ratio) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];

  return {
    meanMs: round(sorted.reduce((sum, ms) => sum + ms, 0) / sorted.length),
    p50Ms: round(percentile(0.5)),
    p95Ms: round(percentile(0.95)),
  };
};

const countContentApiVersions = (strapi) =>
  countRows(strapi.db.connection(HISTORY_TABLE).where({ source: 'content-api' }));

const measureWrites = async (strapi, request, { token, articles, relations }) => {
  const durations = { on: [], off: [] };
  let index = 0;

  const write = async (flag) => {
    strapi.config.set(FLAG, flag === 'on');

    const { ms } = await request(`/api/articles/${articles[index % articles.length]}`, {
      token,
      method: 'PUT',
      body: { data: createArticleData(index, relations) },
    });

    index += 1;
    return ms;
  };

  for (let warmup = 0; warmup < WARMUP_WRITES; warmup += 1) {
    await write('on');
    await write('off');
  }

  for (let measured = 0; measured < MEASURED_WRITES; measured += 1) {
    const order = measured % 2 === 0 ? ['on', 'off'] : ['off', 'on'];

    for (const flag of order) {
      durations[flag].push(await write(flag));
    }
  }

  strapi.config.set(FLAG, true);
  await strapi.db.settleTransactionHooks();

  const versions = await countContentApiVersions(strapi);
  const errors =
    versions === WARMUP_WRITES + MEASURED_WRITES
      ? []
      : [`expected ${WARMUP_WRITES + MEASURED_WRITES} content-api versions, found ${versions}`];

  return { flagOn: summarize(durations.on), flagOff: summarize(durations.off), errors };
};

const toText = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

const measureVersionSize = async (strapi) => {
  const rows = await strapi.db
    .connection(HISTORY_TABLE)
    .select('data', 'schema')
    .where({ source: 'content-api' });
  const average = (column) =>
    Math.round(
      rows.reduce((sum, row) => sum + Buffer.byteLength(toText(row[column])), 0) / rows.length
    );

  return { dataBytes: average('data'), schemaBytes: average('schema') };
};

const getCopiedColumns = async (strapi) =>
  Object.keys(await strapi.db.connection(HISTORY_TABLE).columnInfo()).filter(
    (column) => column !== 'id'
  );

const copyRows = (strapi, columns, { count, where }) => {
  const connection = strapi.db.connection;

  return connection
    .into(connection.raw('?? (??)', [HISTORY_TABLE, columns]))
    .insert(
      connection
        .select(columns)
        .from(
          connection(HISTORY_TABLE)
            .select(columns)
            .where(where)
            .orderBy('id')
            .limit(count)
            .as('copied')
        )
    );
};

const insertListedVersions = async (strapi, columns, { count, listedArticle }) => {
  const rows = await strapi.db
    .connection(HISTORY_TABLE)
    .select(columns)
    .orderBy('id', 'desc')
    .limit(count);

  await strapi.db.connection(HISTORY_TABLE).insert(
    rows.map((row) => ({
      ...row,
      data: toText(row.data),
      schema: toText(row.schema),
      related_document_id: listedArticle,
    }))
  );
};

const fillHistoryTable = async (strapi, { versions, documentVersions }, listedArticle) => {
  const connection = strapi.db.connection;
  const columns = await getCopiedColumns(strapi);
  const otherDocuments = (query) => query.whereNot('related_document_id', listedArticle);
  const otherRowsCount = versions - documentVersions;

  await insertListedVersions(strapi, columns, { count: documentVersions, listedArticle });

  const keptIds = await otherDocuments(connection(HISTORY_TABLE))
    .orderBy('id')
    .limit(otherRowsCount)
    .pluck('id');
  await otherDocuments(connection(HISTORY_TABLE)).whereNotIn('id', keptIds).del();

  let count = keptIds.length;

  while (count < otherRowsCount) {
    const chunkSize = Math.min(otherRowsCount - count, count, COPY_CHUNK_SIZE);

    await copyRows(strapi, columns, { count: chunkSize, where: otherDocuments });
    count += chunkSize;
  }

  const total = await countRows(connection(HISTORY_TABLE));
  const listed = await countRows(
    connection(HISTORY_TABLE).where('related_document_id', listedArticle)
  );

  return total === versions && listed === documentVersions
    ? []
    : [`expected ${versions} versions (${documentVersions} listed), found ${total} (${listed})`];
};

const measureVersionsList = async (request, { adminToken, listedArticle, documentVersions }) => {
  const url = `/content-manager/history-versions?contentType=${ARTICLE_UID}&documentId=${listedArticle}&locale=en&page=1`;
  const durations = [];
  let lastResponse;

  for (let run = 0; run < WARMUP_LISTS + MEASURED_LISTS; run += 1) {
    const { json, ms } = await request(url, { token: adminToken });

    lastResponse = json;
    if (run >= WARMUP_LISTS) {
      durations.push(ms);
    }
  }

  const errors =
    lastResponse.meta.pagination.total === documentVersions
      ? []
      : [`the list answered ${lastResponse.meta.pagination.total} versions`];

  return { ...summarize(durations), errors };
};

/* -------------------------------------------------------------------------------------------------
 * Main
 * -----------------------------------------------------------------------------------------------*/

const measure = async ({ client, level, sqliteFile }) => {
  const { strapi, baseUrl } = await startStrapi();
  const request = createClient(baseUrl);
  const report = { client, level, ...LEVELS[level], errors: [] };

  try {
    const { relations, articles, listedArticle } = await seed(strapi);

    if ((await countRows(strapi.db.connection(HISTORY_TABLE))) > 0) {
      report.errors.push('the seed created history versions');
    }

    const token = await createApiToken(strapi);
    const adminToken = await registerAdmin(request);

    const writes = await measureWrites(strapi, request, { token, articles, relations });
    report.writeFlagOn = writes.flagOn;
    report.writeFlagOff = writes.flagOff;
    report.errors.push(...writes.errors);

    report.versionSize = await measureVersionSize(strapi);

    const fillStart = performance.now();
    report.errors.push(...(await fillHistoryTable(strapi, LEVELS[level], listedArticle)));
    report.fillMs = Math.round(performance.now() - fillStart);

    const tableSize = await getTableSize(strapi, client, sqliteFile);
    report.tableSizeMb = round(tableSize / 1_048_576);
    report.tableBytesPerVersion = Math.round(tableSize / LEVELS[level].versions);
    report.indexes = await getHistoryTableIndexes(strapi);

    const list = await measureVersionsList(request, {
      adminToken,
      listedArticle,
      documentVersions: LEVELS[level].documentVersions,
    });
    const { errors, ...listTimings } = list;
    report.versionsList = listTimings;
    report.errors.push(...errors);
  } finally {
    await strapi.destroy();
  }

  return report;
};

const main = async () => {
  const options = parseArgs();

  setAppEnv(options.client, options.sqliteFile);
  writeAppFiles();
  await dropDatabase(options.client, options.sqliteFile, { recreate: true });

  try {
    console.log(JSON.stringify(await measure(options)));
  } finally {
    await dropDatabase(options.client, options.sqliteFile, { recreate: false });
  }
};

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
