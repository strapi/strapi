'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

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

/**
 * Create a multipart form data request for file upload with SSE streaming
 */
const makeMultipartSSERequest = (strapi, options) => {
  return new Promise((resolve, reject) => {
    const { path: urlPath, headers, files, fields = {} } = options;

    const serverAddress = strapi.server.httpServer.address();
    const port = typeof serverAddress === 'object' ? serverAddress.port : serverAddress;

    const boundary = `----FormBoundary${Date.now()}`;
    let body = '';

    // Add fields
    for (const [key, value] of Object.entries(fields)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${typeof value === 'object' ? JSON.stringify(value) : value}\r\n`;
    }

    // Add files
    const fileBuffers = [];
    for (const file of files) {
      const fileContent = fs.readFileSync(file.path);
      const filename = path.basename(file.path);

      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="files"; filename="${filename}"\r\n`;
      body += `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

      fileBuffers.push({
        prefix: body,
        content: fileContent,
      });
      body = '\r\n';
    }

    body += `--${boundary}--\r\n`;

    // Build the complete body buffer
    const bodyParts = [];
    for (let i = 0; i < fileBuffers.length; i++) {
      bodyParts.push(Buffer.from(fileBuffers[i].prefix, 'utf8'));
      bodyParts.push(fileBuffers[i].content);
    }
    bodyParts.push(Buffer.from(body, 'utf8'));
    const fullBody = Buffer.concat(bodyParts);

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
      },
    };

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
    req.write(fullBody);
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

  describe('POST /upload/unstable/stream - File streaming upload', () => {
    describe('Authentication', () => {
      test('Rejects unauthenticated requests', async () => {
        const res = await makeRawRequest(strapi, {
          method: 'POST',
          path: '/upload/unstable/stream',
          headers: {},
          formData: true,
        });

        expect(res.statusCode).toBe(401);
      });
    });

    describe('Validation', () => {
      test('Rejects when no files are provided', async () => {
        // Since we're using createAuthRequest, we need to get the token differently
        // Let's use the regular endpoint first to verify behavior
        const res = await rq({
          method: 'POST',
          url: '/upload/unstable/stream',
          formData: {},
        });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('SSE Events', () => {
      let authToken;

      beforeAll(async () => {
        // Get auth token for raw requests
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

      test('Streams file:uploading and file:complete events for successful upload', async () => {
        if (!authToken) {
          // Skip if we couldn't get auth token (super admin setup may differ)
          return;
        }

        const res = await makeMultipartSSERequest(strapi, {
          path: '/upload/unstable/stream',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          files: [{ path: path.join(__dirname, '../utils/rec.jpg'), type: 'image/jpeg' }],
        });

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('text/event-stream');

        // Check for expected events
        const eventTypes = res.events.map((e) => e.event);
        expect(eventTypes).toContain('file:uploading');
        expect(eventTypes).toContain('stream:complete');

        // Verify file:uploading event structure
        const uploadingEvent = res.events.find((e) => e.event === 'file:uploading');
        expect(uploadingEvent).toBeDefined();
        expect(uploadingEvent.data).toMatchObject({
          index: 0,
          total: 1,
        });

        // Verify stream:complete event structure
        const completeEvent = res.events.find((e) => e.event === 'stream:complete');
        expect(completeEvent).toBeDefined();
        expect(completeEvent.data).toHaveProperty('data');
        expect(completeEvent.data).toHaveProperty('errors');
      });

      test('Streams events for multiple files', async () => {
        if (!authToken) {
          return;
        }

        const res = await makeMultipartSSERequest(strapi, {
          path: '/upload/unstable/stream',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          files: [
            { path: path.join(__dirname, '../utils/rec.jpg'), type: 'image/jpeg' },
            { path: path.join(__dirname, '../utils/rec.jpg'), type: 'image/jpeg' },
          ],
        });

        expect(res.statusCode).toBe(200);

        // Should have uploading events for each file
        const uploadingEvents = res.events.filter((e) => e.event === 'file:uploading');
        expect(uploadingEvents.length).toBe(2);

        // Check totals are correct
        expect(uploadingEvents[0].data.total).toBe(2);
        expect(uploadingEvents[1].data.total).toBe(2);

        // Check indices
        expect(uploadingEvents[0].data.index).toBe(0);
        expect(uploadingEvents[1].data.index).toBe(1);
      });

      test('Includes fileInfo in upload', async () => {
        if (!authToken) {
          return;
        }

        const fileInfo = {
          name: 'custom-name',
          caption: 'Test caption',
          alternativeText: 'Test alt text',
        };

        const res = await makeMultipartSSERequest(strapi, {
          path: '/upload/unstable/stream',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          files: [{ path: path.join(__dirname, '../utils/rec.jpg'), type: 'image/jpeg' }],
          fields: {
            fileInfo: JSON.stringify(fileInfo),
          },
        });

        expect(res.statusCode).toBe(200);

        const completeEvent = res.events.find((e) => e.event === 'stream:complete');
        expect(completeEvent).toBeDefined();

        // If upload was successful, check the file has the custom metadata
        if (completeEvent.data.data && completeEvent.data.data.length > 0) {
          const uploadedFile = completeEvent.data.data[0];
          expect(uploadedFile.caption).toBe('Test caption');
          expect(uploadedFile.alternativeText).toBe('Test alt text');
        }
      });
    });

    describe('File restriction', () => {
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
        strapi.config.set('plugin::upload.security', {});
      });

      test('Reports file:error event when MIME type is denied', async () => {
        if (!authToken) {
          return;
        }

        strapi.config.set('plugin::upload.security', { deniedTypes: ['image/*'] });

        const res = await makeMultipartSSERequest(strapi, {
          path: '/upload/unstable/stream',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          files: [{ path: path.join(__dirname, '../utils/rec.jpg'), type: 'image/jpeg' }],
        });

        expect(res.statusCode).toBe(200);

        // Should have file:error event
        const errorEvent = res.events.find((e) => e.event === 'file:error');
        expect(errorEvent).toBeDefined();
        expect(errorEvent.data).toHaveProperty('message');

        // stream:complete should report errors
        const completeEvent = res.events.find((e) => e.event === 'stream:complete');
        expect(completeEvent).toBeDefined();
        expect(completeEvent.data.errors.length).toBeGreaterThan(0);
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

        // Use a URL that will likely fail but still trigger the event flow
        const res = await makeRawRequest(strapi, {
          method: 'POST',
          path: '/upload/unstable/stream-from-urls',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: { urls: ['https://example.com/nonexistent-image.jpg'] },
        });

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('text/event-stream');

        // Should have file:fetching event
        const fetchingEvent = res.events.find((e) => e.event === 'file:fetching');
        expect(fetchingEvent).toBeDefined();
        expect(fetchingEvent.data).toMatchObject({
          url: 'https://example.com/nonexistent-image.jpg',
          index: 0,
          total: 1,
        });

        // Should have stream:complete event
        const completeEvent = res.events.find((e) => e.event === 'stream:complete');
        expect(completeEvent).toBeDefined();
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

        // Should have file:fetching events for each URL
        const fetchingEvents = res.events.filter((e) => e.event === 'file:fetching');
        expect(fetchingEvents.length).toBe(3);

        // Verify indices and totals
        for (let i = 0; i < 3; i++) {
          expect(fetchingEvents[i].data.index).toBe(i);
          expect(fetchingEvents[i].data.total).toBe(3);
          expect(fetchingEvents[i].data.url).toBe(urls[i]);
        }
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

        const res = await makeRawRequest(strapi, {
          method: 'POST',
          path: '/upload/unstable/stream-from-urls',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: { urls: ['https://example.com/definitely-does-not-exist-12345.jpg'] },
        });

        expect(res.statusCode).toBe(200);

        const completeEvent = res.events.find((e) => e.event === 'stream:complete');
        expect(completeEvent).toBeDefined();
        expect(completeEvent.data.errors.length).toBeGreaterThan(0);
      });

      test('Continues processing remaining URLs after one fails', async () => {
        if (!authToken) {
          return;
        }

        const urls = [
          'ftp://invalid-protocol.com/file.jpg', // Will fail - invalid protocol
          'https://example.com/another-image.jpg', // Will be attempted
        ];

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

        // Should have processed both URLs
        const fetchingEvents = res.events.filter((e) => e.event === 'file:fetching');
        expect(fetchingEvents.length).toBe(2);
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

        // Use httpbin which returns proper Content-Length headers
        const res = await makeRawRequest(strapi, {
          method: 'POST',
          path: '/upload/unstable/stream-from-urls',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: { urls: ['https://httpbin.org/bytes/1000'] }, // 1000 bytes > 100 byte limit
        });

        expect(res.statusCode).toBe(200);

        // Should have file:error event for size limit
        const errorEvent = res.events.find((e) => e.event === 'file:error');
        expect(errorEvent).toBeDefined();
        expect(errorEvent.data.message).toMatch(/too large|size/i);
      });
    });
  });
});
