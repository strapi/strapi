'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { withMockedFetch, createMockResponse } = require('api-tests/mock-fetch');

let strapi;
let rq;

/**
 * Parse SSE events from a response buffer
 * @param {string} data - Raw SSE response data
 * @returns {Array<{event: string, data: object}>} - Parsed events
 */
const parseSSEEvents = (data) => {
  const events = [];
  const lines = data.split('\n');

  let currentEvent = null;
  let currentData = null;

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6).trim();
      if (currentEvent && currentData) {
        try {
          events.push({ event: currentEvent, data: JSON.parse(currentData) });
        } catch {
          events.push({ event: currentEvent, data: currentData });
        }
        currentEvent = null;
        currentData = null;
      }
    }
  }

  return events;
};

/**
 * Make a raw HTTP request that can handle SSE streaming responses
 */
const makeRawRequest = (strapi, options) => {
  return new Promise((resolve, reject) => {
    const { method, path: urlPath, headers, body, formData } = options;

    const serverAddress = strapi.server.httpServer.address();
    const port = typeof serverAddress === 'object' ? serverAddress.port : serverAddress;

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: {
        ...headers,
      },
    };

    if (body && !formData) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          events: parseSSEEvents(data),
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

describe('Upload SSE Streaming', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('POST /upload/unstable/upload-file - Single file upload', () => {
    describe('Authentication', () => {
      test('Rejects unauthenticated requests', async () => {
        const res = await makeRawRequest(strapi, {
          method: 'POST',
          path: '/upload/unstable/upload-file',
          headers: {},
          formData: true,
        });

        expect(res.statusCode).toBe(401);
      });
    });

    describe('Validation', () => {
      test('Rejects when no files are provided', async () => {
        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/upload-file',
          formData: {},
        });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('Upload', () => {
      test('Uploads a single file and returns the created File', async () => {
        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/upload-file',
          formData: {
            files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          },
        });

        expect(res.statusCode).toBe(201);
        // The endpoint returns the created File object directly (not an array).
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('url');
        expect(res.body.mime).toMatch(/^image\//);
      });

      test('Applies fileInfo metadata to the uploaded file', async () => {
        const fileInfo = {
          name: 'custom-name',
          caption: 'Test caption',
          alternativeText: 'Test alt text',
        };

        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/upload-file',
          formData: {
            files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            fileInfo: JSON.stringify(fileInfo),
          },
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.caption).toBe('Test caption');
        expect(res.body.alternativeText).toBe('Test alt text');
      });
    });

    describe('File restriction', () => {
      afterEach(() => {
        // Reset config after each test
        strapi.config.set('plugin::upload.security', {});
      });

      test('Returns a validation error when MIME type is denied', async () => {
        strapi.config.set('plugin::upload.security', { deniedTypes: ['image/*'] });

        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/upload-file',
          formData: {
            files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          },
        });

        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('POST /upload/unstable/stream-from-urls - URL import', () => {
    describe('Authentication', () => {
      test('Rejects unauthenticated requests', async () => {
        const res = await makeRawRequest(strapi, {
          method: 'POST',
          path: '/upload/unstable/stream-from-urls',
          headers: {},
          body: { urls: ['https://example.com/image.jpg'] },
        });

        expect(res.statusCode).toBe(401);
      });
    });

    describe('Validation', () => {
      test('Rejects when no URLs are provided', async () => {
        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/stream-from-urls',
          body: {},
        });

        expect(res.statusCode).toBe(400);
      });

      test('Rejects when URLs is empty array', async () => {
        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/stream-from-urls',
          body: { urls: [] },
        });

        expect(res.statusCode).toBe(400);
      });

      test('Rejects when URLs is not an array', async () => {
        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/stream-from-urls',
          body: { urls: 'https://example.com/image.jpg' },
        });

        expect(res.statusCode).toBe(400);
      });

      test('Rejects when more than 20 URLs are provided', async () => {
        const urls = Array.from({ length: 21 }, (_, i) => `https://example.com/image${i}.jpg`);

        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/stream-from-urls',
          body: { urls },
        });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('SSE Events', () => {
      let authToken;

      beforeAll(async () => {
        const loginRes = await rq({
          method: 'POST',
          url: '/admin/login',
          body: {
            email: 'admin@strapi.io',
            password: 'Password123',
          },
        });
        authToken = loginRes.body?.data?.token;
      });

      test('Streams file:fetching event when starting URL fetch', async () => {
        if (!authToken) {
          return;
        }

        const url = 'https://example.com/nonexistent-image.jpg';
        await withMockedFetch(
          (u) => (u === url ? createMockResponse({ status: 404, body: '' }) : undefined),
          async () => {
            const res = await makeRawRequest(strapi, {
              method: 'POST',
              path: '/upload/unstable/stream-from-urls',
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: { urls: [url] },
            });

            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toBe('text/event-stream');

            const fetchingEvent = res.events.find((e) => e.event === 'file:fetching');
            expect(fetchingEvent).toBeDefined();
            expect(fetchingEvent.data).toMatchObject({
              url,
              index: 0,
              total: 1,
            });

            const completeEvent = res.events.find((e) => e.event === 'stream:complete');
            expect(completeEvent).toBeDefined();
          }
        );
      });

      test('Streams file:error event for invalid URL protocol', async () => {
        if (!authToken) {
          return;
        }

        const res = await makeRawRequest(strapi, {
          method: 'POST',
          path: '/upload/unstable/stream-from-urls',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: { urls: ['ftp://example.com/file.jpg'] },
        });

        expect(res.statusCode).toBe(200);

        // Should have file:error event for invalid protocol
        const errorEvent = res.events.find((e) => e.event === 'file:error');
        expect(errorEvent).toBeDefined();
        expect(errorEvent.data.message).toMatch(/Invalid URL|protocol/i);
      });

      test('Handles multiple URLs with file:fetching events for each', async () => {
        if (!authToken) {
          return;
        }

        const urls = [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg',
        ];

        await withMockedFetch(
          (u) => (urls.includes(u) ? createMockResponse({ status: 404, body: '' }) : undefined),
          async () => {
            const res = await makeRawRequest(strapi, {
              method: 'POST',
              path: '/upload/unstable/stream-from-urls',
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: { urls },
            });

            expect(res.statusCode).toBe(200);

            const fetchingEvents = res.events.filter((e) => e.event === 'file:fetching');
            expect(fetchingEvents.length).toBe(3);

            for (let i = 0; i < 3; i++) {
              expect(fetchingEvents[i].data.index).toBe(i);
              expect(fetchingEvents[i].data.total).toBe(3);
              expect(fetchingEvents[i].data.url).toBe(urls[i]);
            }
          }
        );
      });
    });

    describe('Error handling', () => {
      let authToken;

      beforeAll(async () => {
        const loginRes = await rq({
          method: 'POST',
          url: '/admin/login',
          body: {
            email: 'admin@strapi.io',
            password: 'Password123',
          },
        });
        authToken = loginRes.body?.data?.token;
      });

      test('Reports errors in stream:complete for failed URLs', async () => {
        if (!authToken) {
          return;
        }

        const url = 'https://example.com/definitely-does-not-exist-12345.jpg';
        await withMockedFetch(
          (u) => (u === url ? createMockResponse({ status: 404, body: '' }) : undefined),
          async () => {
            const res = await makeRawRequest(strapi, {
              method: 'POST',
              path: '/upload/unstable/stream-from-urls',
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: { urls: [url] },
            });

            expect(res.statusCode).toBe(200);

            const completeEvent = res.events.find((e) => e.event === 'stream:complete');
            expect(completeEvent).toBeDefined();
            expect(completeEvent.data.errors.length).toBeGreaterThan(0);
          }
        );
      });

      test('Continues processing remaining URLs after one fails', async () => {
        if (!authToken) {
          return;
        }

        const urls = [
          'ftp://invalid-protocol.com/file.jpg', // Will fail - invalid protocol
          'https://example.com/another-image.jpg', // Will be attempted
        ];

        await withMockedFetch(
          (u) => (u === urls[1] ? createMockResponse({ status: 404, body: '' }) : undefined),
          async () => {
            const res = await makeRawRequest(strapi, {
              method: 'POST',
              path: '/upload/unstable/stream-from-urls',
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: { urls },
            });

            expect(res.statusCode).toBe(200);

            const fetchingEvents = res.events.filter((e) => e.event === 'file:fetching');
            expect(fetchingEvents.length).toBe(2);
          }
        );
      });
    });

    describe('Size limit', () => {
      let authToken;

      beforeAll(async () => {
        const loginRes = await rq({
          method: 'POST',
          url: '/admin/login',
          body: {
            email: 'admin@strapi.io',
            password: 'Password123',
          },
        });
        authToken = loginRes.body?.data?.token;
      });

      afterEach(() => {
        // Reset config after each test
        strapi.config.set('plugin::upload.sizeLimit', 1000000000); // Reset to default 1GB
      });

      test('Rejects files exceeding sizeLimit based on Content-Length header', async () => {
        if (!authToken) {
          return;
        }

        // Set a very small size limit (100 bytes)
        strapi.config.set('plugin::upload.sizeLimit', 100);

        // Use a URL that resolves to a public IP (example.com) so SSRF check passes.
        // Mock fetch so we don't rely on remote servers; mock returns 200 + Content-Length: 1000
        // so the upload service rejects based on size limit.
        const sizeLimitTestUrl = 'https://example.com/bytes/1000';
        await withMockedFetch(
          (url) => {
            if (url === sizeLimitTestUrl) {
              return createMockResponse({
                status: 200,
                headers: { 'Content-Length': '1000' },
                body: Buffer.alloc(1000),
              });
            }
            return undefined;
          },
          async () => {
            const res = await makeRawRequest(strapi, {
              method: 'POST',
              path: '/upload/unstable/stream-from-urls',
              headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: { urls: [sizeLimitTestUrl] }, // 1000 bytes > 100 byte limit
            });

            expect(res.statusCode).toBe(200);

            const errorEvent = res.events.find((e) => e.event === 'file:error');
            expect(errorEvent).toBeDefined();
            expect(errorEvent.data.message).toMatch(/too large|size/i);
          }
        );
      });
    });
  });
});
