'use strict';

/**
 * Benchmark for `sanitize.output`.
 *
 * Measures the pipeline as shipped, so the same script can be run on two branches and
 * the numbers compared directly:
 *
 *   yarn build:code && node --expose-gc packages/core/utils/scripts/bench-sanitize-output.js
 *
 * Two reference points are printed alongside it to keep the result honest:
 *   - a JSON deep clone of the same payload, i.e. the cost of merely copying the data
 *   - a hand-written synchronous whitelist filter that produces byte-identical output,
 *     i.e. roughly the best achievable for this schema and payload
 *
 * The hand-written variant is asserted deep-equal to the shipped output before timing.
 * If that assertion ever fails, the benchmark is comparing two different behaviours and
 * the numbers are meaningless, so it exits non-zero.
 *
 * Options: --iterations <n> (default 200), --sizes <csv> (default 25,100)
 */

const assert = require('assert');
const path = require('path');

const DIST = path.resolve(__dirname, '../dist');
const sanitizers = require(`${DIST}/sanitize/sanitizers.js`);

const args = process.argv.slice(2);
const argOf = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const ITERATIONS = Number(argOf('iterations', 200));
const SIZES = String(argOf('sizes', '25,100')).split(',').map(Number);

// ---------------------------------------------------------------------------
// `isPrivateAttribute` reads strapi.config, so a minimal global is required.
// The counter is what exposes per-key config churn.
// ---------------------------------------------------------------------------

let configReads = 0;
global.strapi = {
  config: {
    get(key, def) {
      configReads += 1;
      return key === 'api.responses.privateAttributes' ? [] : def;
    },
  },
};

// ---------------------------------------------------------------------------
// A content type that exercises the whole sanitizer: private scalars, a password,
// components, a dynamic zone, media and relations.
// ---------------------------------------------------------------------------

const scalars = (n, prefix) => {
  const out = {};
  for (let i = 0; i < n; i += 1) out[`${prefix}${i}`] = { type: 'string' };
  return out;
};

const models = {
  'api::article.article': {
    uid: 'api::article.article',
    modelType: 'contentType',
    kind: 'collectionType',
    options: {},
    attributes: {
      id: { type: 'integer' },
      documentId: { type: 'string' },
      ...scalars(18, 'field'),
      internalNote: { type: 'string', private: true },
      legacyToken: { type: 'string', private: true },
      pwd: { type: 'password' },
      seo: { type: 'component', component: 'shared.seo', repeatable: false },
      blocks: { type: 'component', component: 'shared.block', repeatable: true },
      zone: { type: 'dynamiczone', components: ['shared.seo', 'shared.block'] },
      cover: { type: 'media', multiple: false },
      tags: { type: 'relation', relation: 'oneToMany', target: 'api::tag.tag' },
      author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
      related: { type: 'relation', relation: 'oneToMany', target: 'api::article.article' },
    },
  },
  'shared.seo': {
    uid: 'shared.seo',
    modelType: 'component',
    options: {},
    attributes: { ...scalars(7, 'meta'), metaSecret: { type: 'string', private: true } },
  },
  'shared.block': {
    uid: 'shared.block',
    modelType: 'component',
    options: {},
    attributes: { ...scalars(7, 'body'), bodySecret: { type: 'string', private: true } },
  },
  'api::tag.tag': {
    uid: 'api::tag.tag',
    modelType: 'contentType',
    kind: 'collectionType',
    options: {},
    attributes: {
      id: { type: 'integer' },
      ...scalars(8, 'tag'),
      hidden: { type: 'string', private: true },
    },
  },
  'api::author.author': {
    uid: 'api::author.author',
    modelType: 'contentType',
    kind: 'collectionType',
    options: {},
    attributes: {
      id: { type: 'integer' },
      ...scalars(8, 'auth'),
      email: { type: 'string', private: true },
    },
  },
  'plugin::upload.file': {
    uid: 'plugin::upload.file',
    modelType: 'contentType',
    kind: 'collectionType',
    options: {},
    attributes: { id: { type: 'integer' }, ...scalars(9, 'file') },
  },
};

const getModel = (uid) => models[uid];
const rootSchema = models['api::article.article'];

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

const fill = (model, seed) => {
  const out = {};
  for (const [k, a] of Object.entries(model.attributes)) {
    if (['component', 'dynamiczone', 'media', 'relation'].includes(a.type)) continue;
    out[k] = a.type === 'integer' ? seed : `${k}-${seed}`;
  }
  return out;
};

const richEntity = (seed) => ({
  ...fill(rootSchema, seed),
  seo: { ...fill(models['shared.seo'], seed), __component: 'shared.seo' },
  blocks: [0, 1].map((i) => ({
    ...fill(models['shared.block'], seed + i),
    __component: 'shared.block',
  })),
  zone: [
    { __component: 'shared.seo', ...fill(models['shared.seo'], seed) },
    { __component: 'shared.block', ...fill(models['shared.block'], seed) },
  ],
  cover: fill(models['plugin::upload.file'], seed),
  tags: [0, 1, 2].map((i) => fill(models['api::tag.tag'], seed + i)),
  author: fill(models['api::author.author'], seed),
  related: [0, 1].map((i) => fill(models['api::article.article'], seed + i)),
});

const makePayload = (n) => Array.from({ length: n }, (_, i) => richEntity(i));

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

/** The shipped pipeline. This is the number that matters. */
const shipped = async (payload) => {
  const out = Array.from({ length: payload.length });
  for (let i = 0; i < payload.length; i += 1) {
    out[i] = await sanitizers.defaultSanitizeOutput({ schema: rootSchema, getModel }, payload[i]);
  }
  return out;
};

/** Reference: cost of merely copying the payload. */
const jsonClone = async (payload) => JSON.parse(JSON.stringify(payload));

/**
 * Reference: a hand-written synchronous whitelist filter replicating the shipped
 * semantics exactly — keys with no matching attribute are kept and not recursed into,
 * nil values are not recursed into, a non-array dynamiczone falls through untouched.
 */
const UPLOAD_FILE = 'plugin::upload.file';

const handWritten = (entity, schema) => {
  if (entity === null || typeof entity !== 'object' || !schema) return entity;

  const isArr = Array.isArray(entity);
  if (!isArr && Object.getPrototypeOf(entity) !== Object.prototype) return entity;

  const attrs = schema.attributes;
  const stored = new Set(schema.options?.privateAttributes ?? []);
  const out = isArr ? Array.from({ length: entity.length }) : {};

  for (const key of Object.keys(entity)) {
    const attribute = attrs ? attrs[key] : undefined;

    if (attribute !== undefined) {
      if (attribute.type === 'password') continue;
      if (attribute.private === true) continue;
      if (stored.size !== 0 && stored.has(key)) continue;
    }

    const value = entity[key];
    if (value === null || value === undefined || attribute === undefined) {
      out[key] = value;
      continue;
    }

    const each = (v, s) => (Array.isArray(v) ? v.map((x) => handWritten(x, s)) : handWritten(v, s));

    switch (attribute.type) {
      case 'relation': {
        const morph = attribute.relation.toLowerCase().startsWith('morph');
        out[key] = Array.isArray(value)
          ? value.map((it) => handWritten(it, getModel(morph ? it && it.__type : attribute.target)))
          : handWritten(value, getModel(morph ? value.__type : attribute.target));
        break;
      }
      case 'media':
        out[key] = each(value, getModel(UPLOAD_FILE));
        break;
      case 'component':
        out[key] = each(value, getModel(attribute.component));
        break;
      case 'dynamiczone':
        out[key] = Array.isArray(value)
          ? value.map((it) => (it == null ? it : handWritten(it, getModel(it.__component))))
          : value;
        break;
      default:
        out[key] = value;
    }
  }

  return out;
};

const handWrittenAll = async (payload) => payload.map((e) => handWritten(e, rootSchema));

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

async function timeIt(fn, payload, iterations) {
  for (let i = 0; i < Math.max(5, Math.floor(iterations / 10)); i += 1) await fn(payload);
  if (global.gc) global.gc();

  const times = [];
  for (let i = 0; i < iterations; i += 1) {
    const t0 = process.hrtime.bigint();
    await fn(payload);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  times.sort((a, b) => a - b);
  return {
    mean: times.reduce((a, b) => a + b, 0) / times.length,
    p50: times[Math.floor(times.length * 0.5)],
    p99: times[Math.floor(times.length * 0.99)],
  };
}

(async () => {
  console.log(`node ${process.version}  iterations=${ITERATIONS}  sizes=${SIZES.join(',')}\n`);

  for (const size of SIZES) {
    const payload = makePayload(size);

    const expected = await shipped(payload);
    try {
      assert.deepStrictEqual(await handWrittenAll(payload), expected);
    } catch (e) {
      console.error(
        `FATAL: the hand-written reference no longer matches sanitize.output at size ${size}.\n` +
          `The benchmark would be comparing different behaviours.\n${e.message}`
      );
      process.exit(1);
    }

    configReads = 0;
    await shipped(payload);
    const reads = configReads;

    console.log(`--- ${size} rich entities ---`);
    console.log(`    strapi.config.get calls per pass: ${reads}\n`);

    const rows = [
      ['sanitize.output', await timeIt(shipped, payload, ITERATIONS), 'the shipped pipeline'],
      ['JSON clone', await timeIt(jsonClone, payload, ITERATIONS), 'cost of copying the data'],
      ['hand-written', await timeIt(handWrittenAll, payload, ITERATIONS), 'identical output, sync'],
    ];

    const hdr = [
      'subject'.padEnd(17),
      'mean ms'.padStart(10),
      'p50'.padStart(9),
      'p99'.padStart(9),
    ].join('');
    console.log(hdr);
    console.log('-'.repeat(hdr.length + 30));
    for (const [name, r, note] of rows) {
      console.log(
        name.padEnd(17) +
          r.mean.toFixed(3).padStart(10) +
          r.p50.toFixed(3).padStart(9) +
          r.p99.toFixed(3).padStart(9) +
          `   ${note}`
      );
    }
    console.log();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
