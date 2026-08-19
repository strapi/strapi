'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const _ = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

/**
 * The `Content-Length` fast paths allow 1 MiB of envelope (boundaries, part
 * headers, `fileInfo`) on top of the configured limit, so a file has to clear
 * that margin to trip them. The image fixtures are only a few KB, which is why
 * this suite generates its own oversized file.
 */
const ENVELOPE_MARGIN = 1024 * 1024;
const OVERSIZED_FILE_SIZE = ENVELOPE_MARGIN + 2 * 1024 * 1024; // 3 MiB, comfortably over

let tmpDir;
let oversizedFilePath;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    profilePicture: {
      type: 'media',
    },
  },
};

describe('Upload', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    strapi.config.set('plugin::upload.sizeLimit', 1000);

    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'strapi-size-limit-'));
    oversizedFilePath = path.join(tmpDir, 'oversized.png');
    await fs.promises.writeFile(oversizedFilePath, Buffer.alloc(OVERSIZED_FILE_SIZE));
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  describe('Create', () => {
    test('Rejects when file is bigger than the size limit', async () => {
      // Upload file bigger than 1kb
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: fs.createReadStream(path.join(__dirname, '../utils/strapi.png')) },
      });
      expect(res.statusCode).toBe(413);
      // Small enough to fall through the header fast paths, so this is the exact
      // per-file check reporting the plugin limit.
      expect(res.body.error.message).toMatch(/exceeds size limit of/);
    });

    test('Can upload a file smaller than the size Limit', async () => {
      // Upload file smaller than 1kb
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')) },
      });

      expect(res.statusCode).toBe(201);
    });

    test('Rejects on POST /upload/files when file is bigger than the size limit', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/files',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/strapi.png')),
          fileInfo: JSON.stringify({ name: 'strapi.png' }),
        },
      });

      expect(res.statusCode).toBe(413);
      expect(res.body.error.message).toMatch(/exceeds size limit of/);
    });

    test('Can upload a file smaller than the size limit on POST /upload/files', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/files',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          fileInfo: JSON.stringify({ name: 'rec.jpg' }),
        },
      });

      expect(res.statusCode).toBe(201);
    });

    test('Rejects a POST /upload/files request whose Content-Length exceeds the limit', async () => {
      // Large enough to clear the envelope margin, so the request is refused from
      // the header alone — before the body is streamed to temp disk.
      const res = await rq({
        method: 'POST',
        url: '/upload/files',
        formData: {
          files: fs.createReadStream(oversizedFilePath),
          fileInfo: JSON.stringify({ name: 'oversized.png' }),
        },
      });

      expect(res.statusCode).toBe(413);
      expect(res.body.error.message).toMatch(/exceeds size limit of/);
      // The rejection has to carry a usable message: an early response that
      // arrives as a bare transport error (which forcing the connection closed
      // would cause) leaves the admin nothing to display.
      expect(res.body.error.name).toBe('PayloadTooLargeError');
      // Nothing was persisted — the request never reached the upload service.
      const files = await rq({ method: 'GET', url: '/upload/files' });
      expect(files.body.results.map((f) => f.name)).not.toContain('oversized.png');
    });

    test('Accepts multiple files that are each under the per-file limit', async () => {
      // `sizeLimit` is per-file while `Content-Length` covers the whole request,
      // so the multi-file routes must not gain a header fast path: these two
      // files are individually legal even though their combined envelope is not.
      strapi.config.set('plugin::upload.sizeLimit', 1000000);

      try {
        const res = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: [
              fs.createReadStream(path.join(__dirname, '../utils/strapi.png')),
              fs.createReadStream(path.join(__dirname, '../utils/strapi.jpg')),
            ],
          },
        });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveLength(2);
      } finally {
        strapi.config.set('plugin::upload.sizeLimit', 1000);
      }
    });
  });
});
