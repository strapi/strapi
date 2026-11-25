'use strict';

/**
 * Validates plugin::upload.concurrentUploadSize via real POST /upload requests.
 *
 * Uses plain-text files so each asset performs a single provider upload (no thumbnails).
 * Instruments the filesystem provider API to count peak concurrent uploads.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

const { createStrapiInstance } = require('api-tests/strapi');

const CONTENT_API_UPLOAD_PATH = '/api/upload';

let strapi;

/**
 * Wrap provider upload entrypoints used by `@strapi/upload` for the local provider.
 */
function attachUploadConcurrencyInstrumentation() {
  const providerApi = strapi.plugin('upload').provider;

  let inflight = 0;
  let maxInflight = 0;

  const originalUploadStream = providerApi.uploadStream;
  const originalUpload = providerApi.upload;

  const bump = () => {
    inflight += 1;
    maxInflight = Math.max(maxInflight, inflight);
  };

  const dec = () => {
    inflight -= 1;
  };

  const wrap = (key, impl) => {
    if (typeof impl !== 'function') {
      return;
    }

    providerApi[key] = async function wrappedUpload(...args) {
      bump();
      try {
        return await impl.apply(this, args);
      } finally {
        dec();
      }
    };
  };

  wrap('uploadStream', originalUploadStream);
  wrap('upload', originalUpload);

  return {
    getMaxConcurrent: () => maxInflight,
    reset() {
      inflight = 0;
      maxInflight = 0;
    },
    detach() {
      providerApi.uploadStream = originalUploadStream;
      providerApi.upload = originalUpload;
    },
  };
}

/**
 * multipart `files[]` uploads: api-tests/agent only supports a single `{ path, filename }`; repeat `attach`.
 */
function postPlainTextMultipartUpload(strapiInstance, fixtures) {
  let req = request.agent(strapiInstance.server.httpServer).post(CONTENT_API_UPLOAD_PATH);

  req.auth('test-token', { type: 'bearer' });

  fixtures.forEach(({ path: filePath, filename }) => {
    req = req.attach('files', filePath, {
      filename,
      contentType: 'text/plain',
    });
  });

  return req;
}

function getResponseStatus(res) {
  return res.statusCode ?? res.status;
}

function createDistinctTextFixtures(count) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-upload-concurrency-'));
  const paths = [];

  for (let i = 0; i < count; i += 1) {
    const filePath = path.join(dir, `order-${i}.txt`);
    fs.writeFileSync(filePath, `content-${i}-${Date.now()}-${Math.random()}`, 'utf8');
    paths.push(filePath);
  }

  const cleanup = () => {
    fs.rmSync(dir, { recursive: true, force: true });
  };

  return { paths, cleanup };
}

describe('Upload plugin — concurrentUploadSize (API)', () => {
  let instrumentation;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    instrumentation = attachUploadConcurrencyInstrumentation();
  });

  afterAll(async () => {
    instrumentation.detach();
    await strapi.destroy();
  });

  afterEach(() => {
    instrumentation.reset();
    strapi.config.set('plugin::upload.concurrentUploadSize', 1);
  });

  describe('POST /upload with multiple `.txt` files', () => {
    test('concurrentUploadSize 1 caps peak concurrent provider uploads at 1', async () => {
      strapi.config.set('plugin::upload.concurrentUploadSize', 1);

      const { paths, cleanup } = createDistinctTextFixtures(4);

      try {
        const res = await postPlainTextMultipartUpload(
          strapi,
          paths.map((filePath, i) => ({
            path: filePath,
            filename: `order-${i}.txt`,
          }))
        );

        expect(getResponseStatus(res)).toBe(201);
        expect(res.body).toHaveLength(4);
        expect(instrumentation.getMaxConcurrent()).toBe(1);
      } finally {
        cleanup();
      }
    });

    test('concurrentUploadSize 3 allows peak concurrent provider uploads up to 3', async () => {
      strapi.config.set('plugin::upload.concurrentUploadSize', 3);

      const { paths, cleanup } = createDistinctTextFixtures(10);

      try {
        const res = await postPlainTextMultipartUpload(
          strapi,
          paths.map((filePath, i) => ({
            path: filePath,
            filename: `order-${i}.txt`,
          }))
        );

        expect(getResponseStatus(res)).toBe(201);
        expect(res.body).toHaveLength(10);
        expect(instrumentation.getMaxConcurrent()).toBe(3);
      } finally {
        cleanup();
      }
    });

    test('response file order matches the multipart file order', async () => {
      strapi.config.set('plugin::upload.concurrentUploadSize', 2);

      const { paths, cleanup } = createDistinctTextFixtures(5);

      try {
        const res = await postPlainTextMultipartUpload(
          strapi,
          paths.map((filePath, i) => ({
            path: filePath,
            filename: `order-${i}.txt`,
          }))
        );

        expect(getResponseStatus(res)).toBe(201);
        expect(res.body.map((entry) => entry.name)).toEqual([
          'order-0.txt',
          'order-1.txt',
          'order-2.txt',
          'order-3.txt',
          'order-4.txt',
        ]);
      } finally {
        cleanup();
      }
    });
  });
});
