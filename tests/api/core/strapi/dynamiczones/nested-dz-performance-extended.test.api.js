'use strict';

/*
 * Local experiment only. This deliberately includes depths above the proposed
 * product cap to measure their shape and persistence cost; it does not define
 * supported schema depth.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const UID = 'api::extended-benchmark-page.extended-benchmark-page';
const LEAF_PAYLOAD = 'z'.repeat(256);
const ROOT_COUNT = 10;
const WARMUPS = 5;
const READ_SAMPLES = 20;
const WRITE_SAMPLES = 10;
const RESULTS_PATH = path.resolve(
  process.cwd(),
  process.env.BENCHMARK_RESULTS_PATH ??
    '.agents/work/experiments/nested-dz-performance/extended-results.json'
);

const numberNames = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const leafTypes = numberNames.map((numberName) => `default.perf-ext-leaf-${numberName}`);
const [leafA, leafB] = leafTypes;
const levelUid = (depth, level) =>
  `default.perf-ext-depth-${numberNames[depth - 1]}-level-${numberNames[level - 1]}`;

const component = (displayName, attributes) => ({ displayName, attributes });
const dynamicChildren = (components) => ({ type: 'dynamiczone', components, required: true });
const leafSchemas = leafTypes.map((uid) =>
  component(uid.replace('default.', ''), {
    label: { type: 'string', required: true },
    payload: { type: 'text', required: true },
  })
);

const schemas = {
  d2l1: component(levelUid(2, 1).replace('default.', ''), { children: dynamicChildren(leafTypes) }),
  d3l1: component(levelUid(3, 1).replace('default.', ''), {
    children: dynamicChildren([levelUid(3, 2)]),
  }),
  d3l2: component(levelUid(3, 2).replace('default.', ''), { children: dynamicChildren(leafTypes) }),
  d4l1: component(levelUid(4, 1).replace('default.', ''), {
    children: dynamicChildren([levelUid(4, 2)]),
  }),
  d4l2: component(levelUid(4, 2).replace('default.', ''), {
    children: dynamicChildren([levelUid(4, 3)]),
  }),
  d4l3: component(levelUid(4, 3).replace('default.', ''), { children: dynamicChildren(leafTypes) }),
  page: {
    displayName: 'extended-benchmark-page',
    singularName: 'extended-benchmark-page',
    pluralName: 'extended-benchmark-pages',
    attributes: {
      title: { type: 'string', required: true },
      content: {
        type: 'dynamiczone',
        components: [...leafTypes, levelUid(2, 1), levelUid(3, 1), levelUid(4, 1)],
      },
    },
  },
};

const leaf = (labelIndex, scenarioName, typeCount) => ({
  __component: leafTypes[labelIndex % typeCount],
  label: `${scenarioName}-leaf-${labelIndex}`,
  payload: LEAF_PAYLOAD,
});

const makeTree = (depth, leafCount, scenarioName, typeCount) => {
  const leavesPerRoot = leafCount / ROOT_COUNT;
  if (!Number.isInteger(leavesPerRoot))
    throw new Error(`Cannot split ${leafCount} leaves across ${ROOT_COUNT} roots`);
  if (depth === 1)
    return Array.from({ length: leafCount }, (_, index) => leaf(index, scenarioName, typeCount));

  return Array.from({ length: ROOT_COUNT }, (_, rootIndex) => {
    const children = Array.from({ length: leavesPerRoot }, (_, childIndex) =>
      leaf(rootIndex * leavesPerRoot + childIndex, scenarioName, typeCount)
    );
    if (depth === 2) return { __component: levelUid(2, 1), children };
    if (depth === 3) {
      return {
        __component: levelUid(3, 1),
        children: [{ __component: levelUid(3, 2), children }],
      };
    }
    return {
      __component: levelUid(4, 1),
      children: [
        { __component: levelUid(4, 2), children: [{ __component: levelUid(4, 3), children }] },
      ],
    };
  });
};

const populateForDepth = (depth, typeCount) => {
  const leafOn = Object.fromEntries(leafTypes.slice(0, typeCount).map((uid) => [uid, true]));
  if (depth === 1) return { content: { on: leafOn } };
  if (depth === 2)
    return { content: { on: { [levelUid(2, 1)]: { populate: { children: { on: leafOn } } } } } };
  if (depth === 3) {
    return {
      content: {
        on: {
          [levelUid(3, 1)]: {
            populate: {
              children: { on: { [levelUid(3, 2)]: { populate: { children: { on: leafOn } } } } },
            },
          },
        },
      },
    };
  }
  return {
    content: {
      on: {
        [levelUid(4, 1)]: {
          populate: {
            children: {
              on: {
                [levelUid(4, 2)]: {
                  populate: {
                    children: {
                      on: { [levelUid(4, 3)]: { populate: { children: { on: leafOn } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
};

const scenarios = [1, 2, 3, 4]
  .flatMap((depth) =>
    [130, 500, 1000].map((leafCount) => ({
      name: `d${depth}-w${leafCount}-t2`,
      depth,
      leafCount,
      typeCount: 2,
      totalNodes: leafCount + ROOT_COUNT * (depth - 1),
      tree: makeTree(depth, leafCount, `d${depth}-w${leafCount}-t2`, 2),
      populate: populateForDepth(depth, 2),
    }))
  )
  .concat(
    [5, 10].map((typeCount) => ({
      name: `d2-w500-t${typeCount}`,
      depth: 2,
      leafCount: 500,
      typeCount,
      totalNodes: 510,
      tree: makeTree(2, 500, `d2-w500-t${typeCount}`, typeCount),
      populate: populateForDepth(2, typeCount),
    }))
  );

const normalized = (value) => {
  if (Array.isArray(value)) return value.map(normalized);
  if (!value || typeof value !== 'object') return value;
  if (Object.hasOwn(value, '__component')) {
    const result = { __component: value.__component };
    if (Object.hasOwn(value, 'label')) {
      result.label = value.label;
      result.payload = value.payload;
    }
    if (Object.hasOwn(value, 'children')) result.children = normalized(value.children);
    return result;
  }
  return value;
};

const componentNodes = (value) => {
  if (Array.isArray(value)) return value.flatMap(componentNodes);
  if (!value || typeof value !== 'object') return [];
  const own = Object.hasOwn(value, '__component') ? [value] : [];
  return own.concat(...Object.values(value).flatMap(componentNodes));
};

const leafNodes = (value) =>
  componentNodes(value).filter((node) => leafTypes.includes(node.__component));
const orderedDigest = (value) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized(value)))
    .digest('hex');

const assertShape = (actual, scenario, expected) => {
  expect(normalized(actual)).toStrictEqual(normalized(expected));
  expect(componentNodes(actual)).toHaveLength(scenario.totalNodes);
  expect(leafNodes(actual)).toHaveLength(scenario.leafCount);
  expect(orderedDigest(actual)).toBe(orderedDigest(expected));
};

const updateTarget = (tree, depth) => {
  if (depth === 1) return tree.at(-1);
  if (depth === 2) return tree.at(-1).children.at(-1);
  if (depth === 3) return tree.at(-1).children[0].children.at(-1);
  return tree.at(-1).children[0].children[0].children.at(-1);
};

const summarize = (samples) => {
  const values = (field) => samples.map((sample) => sample[field]).sort((a, b) => a - b);
  const at = (values, p) => values[Math.ceil(values.length * p) - 1];
  const duration = values('durationMs');
  const queries = values('queryCount');
  return {
    sampleCount: samples.length,
    durationMs: {
      p50: Number(at(duration, 0.5).toFixed(3)),
      p95: Number(at(duration, 0.95).toFixed(3)),
    },
    queryCount: { p50: at(queries, 0.5), p95: at(queries, 0.95) },
    rawSamples: samples.map(({ durationMs, queryCount, responseBytes }) => ({
      durationMs: Number(durationMs.toFixed(3)),
      queryCount,
      ...(responseBytes ? { responseBytes } : {}),
    })),
  };
};

const results = {
  provenance: {
    commit: 'deedbb9ec033c102b7734a974dcab500c7ea0eef',
    node: process.version,
    database: 'sqlite',
    packageEntries: Object.fromEntries(
      ['@strapi/core', '@strapi/database', '@strapi/strapi'].map((packageName) => [
        packageName,
        fs.realpathSync(require.resolve(packageName)),
      ])
    ),
    leafPayloadBytes: Buffer.byteLength(LEAF_PAYLOAD),
    rootContainerCount: ROOT_COUNT,
    warmups: WARMUPS,
    readSamples: READ_SAMPLES,
    writeSamples: WRITE_SAMPLES,
    reverseOrder: process.env.BENCHMARK_REVERSE_ORDER === '1',
  },
  scenarios: {},
};

const measure = async (operation) => {
  let queryCount = 0;
  const listener = () => {
    queryCount += 1;
  };
  strapi.db.connection.on('query', listener);
  const started = process.hrtime.bigint();
  try {
    const value = await operation();
    return { value, queryCount, durationMs: Number(process.hrtime.bigint() - started) / 1e6 };
  } finally {
    strapi.db.connection.off('query', listener);
  }
};

describe('extended nested dynamic-zone local performance experiment', () => {
  beforeAll(async () => {
    for (const leafSchema of leafSchemas) builder.addComponent(leafSchema);
    await builder
      // The builder bootstraps GraphQL as components are registered: children first.
      .addComponent(schemas.d4l3)
      .addComponent(schemas.d4l2)
      .addComponent(schemas.d4l1)
      .addComponent(schemas.d3l2)
      .addComponent(schemas.d3l1)
      .addComponent(schemas.d2l1)
      .addContentType(schemas.page)
      .build();
    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/extended-benchmark-pages');
    const sqliteVersion = await strapi.db.connection.raw('select sqlite_version() as version');
    results.provenance.sqliteVersion = sqliteVersion[0].version;
    results.provenance.draftAndPublish = strapi.contentType(UID).options.draftAndPublish === true;
  });

  afterAll(async () => {
    await fsp.mkdir(path.dirname(RESULTS_PATH), { recursive: true });
    await fsp.writeFile(RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`);
    if (strapi) await strapi.destroy();
    await builder.cleanup();
  });

  test.each(process.env.BENCHMARK_REVERSE_ORDER === '1' ? [...scenarios].reverse() : scenarios)(
    '$name persists and measures full trees',
    async (scenario) => {
      const create = () =>
        strapi.documents(UID).create({
          data: { title: scenario.name, content: structuredClone(scenario.tree) },
          status: 'draft',
        });
      const verifyCreated = async (documentId, expected = scenario.tree) => {
        const document = await strapi
          .documents(UID)
          .findOne({ documentId, populate: scenario.populate, status: 'draft' });
        assertShape(document.content, scenario, expected);
        return document;
      };

      const createdDocuments = [];
      for (let index = 0; index < WARMUPS; index += 1) createdDocuments.push(await create());
      const createSamples = [];
      for (let index = 0; index < WRITE_SAMPLES; index += 1) {
        const sample = await measure(create);
        createSamples.push(sample);
        createdDocuments.push(sample.value);
      }
      for (const sample of createSamples) await verifyCreated(sample.value.documentId);

      const seed = await create();
      createdDocuments.push(seed);
      let document = await verifyCreated(seed.documentId);
      const find = () =>
        strapi
          .documents(UID)
          .findOne({ documentId: seed.documentId, populate: scenario.populate, status: 'draft' });
      const rest = () =>
        rq({
          method: 'GET',
          url: `/${seed.documentId}`,
          qs: { populate: scenario.populate, status: 'draft' },
        });

      for (let index = 0; index < WARMUPS; index += 1) await find();
      for (let index = 0; index < WARMUPS; index += 1) expect((await rest()).statusCode).toBe(200);

      const dsReads = [];
      for (let index = 0; index < READ_SAMPLES; index += 1) {
        const sample = await measure(find);
        assertShape(sample.value.content, scenario, scenario.tree);
        dsReads.push(sample);
      }
      const restReads = [];
      for (let index = 0; index < READ_SAMPLES; index += 1) {
        const sample = await measure(rest);
        expect(sample.value.statusCode).toBe(200);
        assertShape(sample.value.body.data.content, scenario, scenario.tree);
        restReads.push({
          ...sample,
          responseBytes: Buffer.byteLength(JSON.stringify(sample.value.body)),
        });
      }

      const updateOnce = async (index) => {
        const fullTree = structuredClone(document.content);
        const beforeIds = componentNodes(fullTree).map((node) => node.id);
        const target = updateTarget(fullTree, scenario.depth);
        target.payload = `${LEAF_PAYLOAD.slice(0, -8)}${String(index).padStart(8, '0')}`;
        const sample = await measure(() =>
          strapi
            .documents(UID)
            .update({ documentId: seed.documentId, data: { content: fullTree }, status: 'draft' })
        );
        document = await find();
        assertShape(document.content, scenario, fullTree);
        expect(componentNodes(document.content).map((node) => node.id)).toStrictEqual(beforeIds);
        return sample;
      };

      for (let index = 0; index < WARMUPS; index += 1) await updateOnce(-index - 1);
      const updateSamples = [];
      for (let index = 0; index < WRITE_SAMPLES; index += 1)
        updateSamples.push(await updateOnce(index));

      results.scenarios[scenario.name] = {
        dynamicZoneDepth: scenario.depth,
        rootContainerCount: scenario.depth === 1 ? 0 : ROOT_COUNT,
        leafTypes: scenario.typeCount,
        totalLeafNodes: scenario.leafCount,
        totalComponentNodes: scenario.totalNodes,
        documentServiceCreate: summarize(createSamples),
        documentServiceRead: summarize(dsReads),
        restRead: {
          ...summarize(restReads),
          responseBytes: {
            p50: [...restReads].sort((a, b) => a.responseBytes - b.responseBytes)[
              Math.ceil(restReads.length / 2) - 1
            ].responseBytes,
            p95: [...restReads].sort((a, b) => a.responseBytes - b.responseBytes)[
              Math.ceil(restReads.length * 0.95) - 1
            ].responseBytes,
          },
        },
        documentServiceUpdate: summarize(updateSamples),
      };

      // Cleanup happens after every measured and verified operation so later scenarios
      // do not inherit the prior scenario's documents or component rows.
      for (const createdDocument of createdDocuments) {
        await strapi.documents(UID).delete({ documentId: createdDocument.documentId });
      }
    },
    180000
  );
});
