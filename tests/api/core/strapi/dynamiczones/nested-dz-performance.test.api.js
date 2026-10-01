'use strict';

/**
 * Local experimental harness. It intentionally covers a depth-three tree as a
 * control; production validation is expected to cap supported schemas at two
 * dynamic zones per root path.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const PAYLOAD = 'x'.repeat(256);
const UID = 'api::benchmark-page.benchmark-page';
const RESULTS_PATH = path.resolve(
  process.cwd(),
  process.env.BENCHMARK_RESULTS_PATH ??
    '.agents/work/experiments/nested-dz-performance/results.json'
);
const results = {
  provenance: {
    commit: 'deedbb9ec033c102b7734a974dcab500c7ea0eef',
    database: 'sqlite',
    runtime: process.version,
    payloadBytesPerLeaf: Buffer.byteLength(PAYLOAD),
    warmups: 5,
    readSamples: 20,
    writeSamples: 10,
  },
  scenarios: {},
};

const leaf = (type, index) => ({
  __component: type,
  label: `${type}-${index}`,
  payload: PAYLOAD,
});

const schemas = {
  leafA: {
    displayName: 'perf-leaf-a',
    attributes: {
      label: { type: 'string', required: true },
      payload: { type: 'text', required: true },
    },
  },
  leafB: {
    displayName: 'perf-leaf-b',
    attributes: {
      label: { type: 'string', required: true },
      payload: { type: 'text', required: true },
    },
  },
  containerV2: {
    displayName: 'perf-container-v2',
    attributes: {
      children: {
        type: 'dynamiczone',
        components: ['default.perf-leaf-a', 'default.perf-leaf-b'],
        required: true,
      },
    },
  },
  containerV3Mid: {
    displayName: 'perf-container-v3-mid',
    attributes: {
      children: {
        type: 'dynamiczone',
        components: ['default.perf-leaf-a', 'default.perf-leaf-b'],
        required: true,
      },
    },
  },
  containerV3Top: {
    displayName: 'perf-container-v3-top',
    attributes: {
      children: {
        type: 'dynamiczone',
        components: ['default.perf-container-v3-mid'],
        required: true,
      },
    },
  },
  fixedContainerV2: {
    displayName: 'perf-fixed-container-v2',
    attributes: {
      children: {
        type: 'component',
        component: 'default.perf-leaf-a',
        repeatable: true,
        required: true,
      },
    },
  },
  page: {
    displayName: 'benchmark-page',
    singularName: 'benchmark-page',
    pluralName: 'benchmark-pages',
    attributes: {
      title: { type: 'string', required: true },
      flat30: { type: 'dynamiczone', components: ['default.perf-leaf-a', 'default.perf-leaf-b'] },
      flat130: { type: 'dynamiczone', components: ['default.perf-leaf-a', 'default.perf-leaf-b'] },
      fixed130: { type: 'component', component: 'default.perf-leaf-a', repeatable: true },
      nestedD2: {
        type: 'dynamiczone',
        components: ['default.perf-leaf-a', 'default.perf-leaf-b', 'default.perf-container-v2'],
      },
      nestedD2SingleType: {
        type: 'dynamiczone',
        components: ['default.perf-leaf-a', 'default.perf-container-v2'],
      },
      nestedFixedD2: {
        type: 'dynamiczone',
        components: ['default.perf-leaf-a', 'default.perf-fixed-container-v2'],
      },
      nestedD3: { type: 'dynamiczone', components: ['default.perf-container-v3-top'] },
    },
  },
};

const flat = (count) =>
  Array.from({ length: count }, (_, index) =>
    leaf(index % 2 === 0 ? 'default.perf-leaf-a' : 'default.perf-leaf-b', index)
  );

const nestedD2 = () => [
  ...flat(20),
  ...Array.from({ length: 10 }, (_, outer) => ({
    __component: 'default.perf-container-v2',
    children: Array.from({ length: 10 }, (_, inner) =>
      leaf(
        (outer + inner) % 2 === 0 ? 'default.perf-leaf-a' : 'default.perf-leaf-b',
        20 + outer * 10 + inner
      )
    ),
  })),
];

const nestedD2SingleType = () => [
  ...Array.from({ length: 20 }, (_, index) => leaf('default.perf-leaf-a', index)),
  ...Array.from({ length: 10 }, (_, outer) => ({
    __component: 'default.perf-container-v2',
    children: Array.from({ length: 10 }, (_, inner) =>
      leaf('default.perf-leaf-a', 20 + outer * 10 + inner)
    ),
  })),
];

const nestedFixedD2 = () => [
  ...Array.from({ length: 20 }, (_, index) => leaf('default.perf-leaf-a', index)),
  ...Array.from({ length: 10 }, (_, outer) => ({
    __component: 'default.perf-fixed-container-v2',
    children: Array.from({ length: 10 }, (_, inner) => ({
      label: `default.perf-leaf-a-${20 + outer * 10 + inner}`,
      payload: PAYLOAD,
    })),
  })),
];

const nestedD3 = () =>
  Array.from({ length: 10 }, (_, top) => ({
    __component: 'default.perf-container-v3-top',
    children: [
      {
        __component: 'default.perf-container-v3-mid',
        children: Array.from({ length: 11 }, (_, inner) =>
          leaf(
            (top + inner) % 2 === 0 ? 'default.perf-leaf-a' : 'default.perf-leaf-b',
            top * 11 + inner
          )
        ),
      },
    ],
  }));

const scenarios = {
  flat30: {
    totalNodes: 30,
    totalLeaves: 30,
    data: flat(30),
    populate: { flat30: { on: { 'default.perf-leaf-a': true, 'default.perf-leaf-b': true } } },
  },
  flat130: {
    totalNodes: 130,
    totalLeaves: 130,
    data: flat(130),
    populate: { flat130: { on: { 'default.perf-leaf-a': true, 'default.perf-leaf-b': true } } },
  },
  fixed130: {
    totalNodes: 130,
    totalLeaves: 130,
    data: Array.from({ length: 130 }, (_, index) => ({
      label: `fixed-${index}`,
      payload: PAYLOAD,
    })),
    populate: { fixed130: true },
  },
  nestedD2: {
    totalNodes: 130,
    totalLeaves: 120,
    data: nestedD2(),
    populate: {
      nestedD2: {
        on: {
          'default.perf-leaf-a': true,
          'default.perf-leaf-b': true,
          'default.perf-container-v2': {
            populate: {
              children: { on: { 'default.perf-leaf-a': true, 'default.perf-leaf-b': true } },
            },
          },
        },
      },
    },
  },
  nestedD2SingleType: {
    totalNodes: 130,
    totalLeaves: 120,
    data: nestedD2SingleType(),
    populate: {
      nestedD2SingleType: {
        on: {
          'default.perf-leaf-a': true,
          'default.perf-container-v2': {
            populate: { children: { on: { 'default.perf-leaf-a': true } } },
          },
        },
      },
    },
  },
  nestedFixedD2: {
    totalNodes: 130,
    totalLeaves: 120,
    data: nestedFixedD2(),
    populate: {
      nestedFixedD2: {
        on: {
          'default.perf-leaf-a': true,
          'default.perf-fixed-container-v2': { populate: { children: true } },
        },
      },
    },
  },
  nestedD3: {
    totalNodes: 130,
    totalLeaves: 110,
    data: nestedD3(),
    populate: {
      nestedD3: {
        on: {
          'default.perf-container-v3-top': {
            populate: {
              children: {
                on: {
                  'default.perf-container-v3-mid': {
                    populate: {
                      children: {
                        on: { 'default.perf-leaf-a': true, 'default.perf-leaf-b': true },
                      },
                    },
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

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * p) - 1];
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
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    return { durationMs, queryCount, value };
  } finally {
    strapi.db.connection.off('query', listener);
  }
};

const nodeCount = (value) => {
  if (Array.isArray(value)) return value.reduce((total, item) => total + nodeCount(item), 0);
  if (!value || typeof value !== 'object') return 0;
  return Object.entries(value).reduce(
    (total, [, item]) => total + nodeCount(item),
    Object.hasOwn(value, '__component') ||
      (Object.hasOwn(value, 'label') && Object.hasOwn(value, 'payload'))
      ? 1
      : 0
  );
};

const leaves = (value) => {
  if (Array.isArray(value)) return value.flatMap(leaves);
  if (!value || typeof value !== 'object') return [];
  if (Object.hasOwn(value, 'label') && Object.hasOwn(value, 'payload')) return [value];
  return Object.values(value).flatMap(leaves);
};

const leafDigest = (value) =>
  crypto
    .createHash('sha256')
    .update(
      leaves(value)
        .map(({ label, payload }) => `${label}:${payload}`)
        .sort()
        .join('|')
    )
    .digest('hex');

const assertCompleteTree = (value, scenario, expectedDigest) => {
  const allLeaves = leaves(value);
  expect(nodeCount(value)).toBe(scenario.totalNodes);
  expect(allLeaves).toHaveLength(scenario.totalLeaves);
  expect(new Set(allLeaves.map((item) => item.label)).size).toBe(allLeaves.length);
  expect(leafDigest(value)).toBe(expectedDigest);
};

const assertScenarioShape = (field, value) => {
  if (field === 'nestedD2' || field === 'nestedD2SingleType') {
    expect(value).toHaveLength(30);
    expect(
      value.slice(0, 20).every((item) => item.__component.startsWith('default.perf-leaf-'))
    ).toBe(true);
    expect(
      value
        .slice(20)
        .every(
          (item) => item.__component === 'default.perf-container-v2' && item.children.length === 10
        )
    ).toBe(true);
  } else if (field === 'nestedFixedD2') {
    expect(value).toHaveLength(30);
    expect(
      value
        .slice(20)
        .every(
          (item) =>
            item.__component === 'default.perf-fixed-container-v2' && item.children.length === 10
        )
    ).toBe(true);
  } else if (field === 'nestedD3') {
    expect(value).toHaveLength(10);
    expect(
      value.every(
        (top) =>
          top.__component === 'default.perf-container-v3-top' &&
          top.children.length === 1 &&
          top.children[0].__component === 'default.perf-container-v3-mid' &&
          top.children[0].children.length === 11
      )
    ).toBe(true);
  } else {
    expect(value).toHaveLength(field === 'flat30' ? 30 : 130);
  }
};

const firstLeaf = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstLeaf(item);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    if (Object.hasOwn(value, 'payload')) return value;
    for (const item of Object.values(value)) {
      const found = firstLeaf(item);
      if (found) return found;
    }
  }
  return undefined;
};

const summarize = (samples) => ({
  sampleCount: samples.length,
  durationMs: {
    p50: Number(
      percentile(
        samples.map((sample) => sample.durationMs),
        0.5
      ).toFixed(3)
    ),
    p95: Number(
      percentile(
        samples.map((sample) => sample.durationMs),
        0.95
      ).toFixed(3)
    ),
  },
  queryCount: {
    p50: percentile(
      samples.map((sample) => sample.queryCount),
      0.5
    ),
    p95: percentile(
      samples.map((sample) => sample.queryCount),
      0.95
    ),
  },
  rawSamples: samples.map((sample) => ({
    durationMs: Number(sample.durationMs.toFixed(3)),
    queryCount: sample.queryCount,
    ...(sample.responseBytes ? { responseBytes: sample.responseBytes } : {}),
  })),
});

describe('nested dynamic-zone local performance experiment', () => {
  beforeAll(async () => {
    await builder
      .addComponent(schemas.leafA)
      .addComponent(schemas.leafB)
      .addComponent(schemas.containerV2)
      .addComponent(schemas.containerV3Mid)
      .addComponent(schemas.containerV3Top)
      .addComponent(schemas.fixedContainerV2)
      .addContentType(schemas.page)
      .build();
    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/benchmark-pages');
  });

  afterAll(async () => {
    await fs.mkdir(path.dirname(RESULTS_PATH), { recursive: true });
    await fs.writeFile(RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`);
    await strapi.destroy();
    await builder.cleanup();
  });

  test.each(
    process.env.BENCHMARK_REVERSE_ORDER === '1'
      ? Object.entries(scenarios).reverse()
      : Object.entries(scenarios)
  )('%s persists, fully populates, and updates all benchmark samples', async (field, scenario) => {
    const expectedInitialDigest = leafDigest(scenario.data);
    const createDocument = () =>
      strapi.documents(UID).create({
        data: { title: field, [field]: structuredClone(scenario.data) },
        status: 'draft',
      });

    // Creates are warmed and sampled separately; neither fixture setup nor cleanup is timed.
    for (let index = 0; index < results.provenance.warmups; index += 1) await createDocument();
    const createSamples = [];
    for (let index = 0; index < results.provenance.writeSamples; index += 1) {
      createSamples.push(await measure(createDocument));
    }
    for (const sample of createSamples) {
      const persisted = await strapi.documents(UID).findOne({
        documentId: sample.value.documentId,
        populate: scenario.populate,
        status: 'draft',
      });
      assertScenarioShape(field, persisted[field]);
      assertCompleteTree(persisted[field], scenario, expectedInitialDigest);
    }
    const created = await createDocument();

    const find = () =>
      strapi
        .documents(UID)
        .findOne({ documentId: created.documentId, populate: scenario.populate, status: 'draft' });
    const initial = await find();
    assertScenarioShape(field, initial[field]);
    assertCompleteTree(initial[field], scenario, expectedInitialDigest);
    expect(firstLeaf(initial[field]).payload).toHaveLength(PAYLOAD.length);

    const restInitial = await rq({
      method: 'GET',
      url: `/${created.documentId}`,
      qs: { populate: scenario.populate, status: 'draft' },
    });
    expect(restInitial.statusCode).toBe(200);
    assertScenarioShape(field, restInitial.body.data[field]);
    assertCompleteTree(restInitial.body.data[field], scenario, expectedInitialDigest);
    expect(Buffer.byteLength(JSON.stringify(restInitial.body))).toBeGreaterThan(
      scenario.totalNodes * PAYLOAD.length
    );

    for (let index = 0; index < results.provenance.warmups; index += 1) await find();
    for (let index = 0; index < results.provenance.warmups; index += 1) {
      const response = await rq({
        method: 'GET',
        url: `/${created.documentId}`,
        qs: { populate: scenario.populate, status: 'draft' },
      });
      expect(response.statusCode).toBe(200);
    }
    const dsReads = [];
    for (let index = 0; index < results.provenance.readSamples; index += 1) {
      const sample = await measure(find);
      assertScenarioShape(field, sample.value[field]);
      assertCompleteTree(sample.value[field], scenario, expectedInitialDigest);
      dsReads.push(sample);
    }

    const restReads = [];
    for (let index = 0; index < results.provenance.readSamples; index += 1) {
      const sample = await measure(() =>
        rq({
          method: 'GET',
          url: `/${created.documentId}`,
          qs: { populate: scenario.populate, status: 'draft' },
        })
      );
      expect(sample.value.statusCode).toBe(200);
      assertScenarioShape(field, sample.value.body.data[field]);
      assertCompleteTree(sample.value.body.data[field], scenario, expectedInitialDigest);
      restReads.push({
        ...sample,
        responseBytes: Buffer.byteLength(JSON.stringify(sample.value.body)),
      });
    }

    const updateField = async (index) => {
      const current = await find();
      const payload = structuredClone(current[field]);
      const target =
        field === 'nestedD2' || field === 'nestedD2SingleType'
          ? payload[29].children[9]
          : field === 'nestedFixedD2'
            ? payload[29].children[9]
            : field === 'nestedD3'
              ? payload[9].children[0].children[10]
              : leaves(payload).at(-1);
      target.payload = `${PAYLOAD.slice(0, -8)}${String(index).padStart(8, '0')}`;
      const expectedDigest = leafDigest(payload);
      const sample = await measure(() =>
        strapi.documents(UID).update({
          documentId: created.documentId,
          data: { [field]: payload },
          status: 'draft',
        })
      );
      const verified = await find();
      assertScenarioShape(field, verified[field]);
      assertCompleteTree(verified[field], scenario, expectedDigest);
      return sample;
    };

    for (let index = 0; index < results.provenance.warmups; index += 1)
      await updateField(-index - 1);
    const writeSamples = [];
    for (let index = 0; index < results.provenance.writeSamples; index += 1) {
      writeSamples.push(await updateField(index));
    }

    results.scenarios[field] = {
      totalComponentNodes: scenario.totalNodes,
      totalLeafNodes: scenario.totalLeaves,
      dynamicZoneDepth:
        field === 'nestedD3'
          ? 3
          : field === 'nestedD2' || field === 'nestedD2SingleType'
            ? 2
            : field === 'fixed130'
              ? 0
              : 1,
      documentServiceRead: summarize(dsReads),
      restRead: {
        ...summarize(restReads),
        responseBytes: {
          p50: percentile(
            restReads.map((sample) => sample.responseBytes),
            0.5
          ),
          p95: percentile(
            restReads.map((sample) => sample.responseBytes),
            0.95
          ),
        },
      },
      documentServiceCreate: summarize(createSamples),
      documentServiceUpdate: summarize(writeSamples),
    };
  });
});
