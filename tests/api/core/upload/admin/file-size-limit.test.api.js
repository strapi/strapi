'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let contentAPIRq;

const smallFile = () => fs.createReadStream(path.join(__dirname, '../utils/rec.jpg'));
const largeFile = () => fs.createReadStream(path.join(__dirname, '../utils/strapi.png'));
const otherLargeFile = () => fs.createReadStream(path.join(__dirname, '../utils/strapi.jpg'));

/**
 * The `Content-Length` fast paths allow 1 MiB of envelope (boundaries, part
 * headers, `fileInfo`) on top of the configured limit, so a file has to clear
 * that margin to trip them. The image fixtures are only a few KB, which is why
 * this suite generates its own oversized file in `beforeAll`.
 */
const ENVELOPE_MARGIN = 1024 * 1024;
const OVERSIZED_FILE_SIZE = ENVELOPE_MARGIN + 2 * 1024 * 1024; // 3 MiB, comfortably over

let tmpDir;
let oversizedFilePath;

const oversizedFile = () => fs.createReadStream(oversizedFilePath);

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
    contentAPIRq = await createContentAPIRequest({ strapi });

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
        formData: { files: largeFile() },
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
        formData: { files: smallFile() },
      });

      expect(res.statusCode).toBe(201);
    });

    test('Rejects on POST /upload/files when file is bigger than the size limit', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/files',
        formData: {
          files: largeFile(),
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
          files: smallFile(),
          fileInfo: JSON.stringify({ name: 'rec.jpg' }),
        },
      });

      expect(res.statusCode).toBe(201);
    });

    test('Rejects a POST /upload/files request whose Content-Length exceeds the limit', async () => {
      // Large enough to clear the envelope margin, so the request is refused from
      // the header alone — before the body is streamed to temp disk.
      //
      // The server answers with `Connection: close` and never drains the
      // request, so the client's upload is cut off mid-send — that is the point
      // (browsers otherwise stream the whole body before surfacing the 413).
      // supertest may surface the interrupted write as `EPIPE` before it reads
      // the response, so accept either ordering and assert what holds in both:
      // nothing was persisted. The unit tests pin the rejection deterministically.
      let res;
      try {
        res = await rq({
          method: 'POST',
          url: '/upload/files',
          formData: {
            files: oversizedFile(),
            fileInfo: JSON.stringify({ name: 'oversized.png' }),
          },
        });
      } catch (err) {
        expect(err.code).toBe('EPIPE');
      }

      if (res) {
        expect(res.statusCode).toBe(413);
        expect(res.body.error.message).toMatch(/exceeds size limit of/);
        // When the response does win the race it must carry a usable message,
        // not just a status, so the admin has something to display.
        expect(res.body.error.name).toBe('PayloadTooLargeError');
      }

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
            files: [largeFile(), otherLargeFile()],
          },
        });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveLength(2);
      } finally {
        strapi.config.set('plugin::upload.sizeLimit', 1000);
      }
    });
  });

  describe('Replace', () => {
    // Every replace entry point funnels through uploadService.replace(), which used
    // to skip the size check entirely — only the create paths were guarded.
    let fileId;

    beforeEach(async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: smallFile() },
      });

      expect(res.statusCode).toBe(201);
      fileId = res.body[0].id;
    });

    describe('POST /upload/files/:id/replace', () => {
      test('Rejects when the replacement file is bigger than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload/files/${fileId}/replace`,
          formData: { files: largeFile() },
        });

        expect(res.statusCode).toBe(413);
      });

      test('Can replace with a file smaller than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload/files/${fileId}/replace`,
          formData: { files: smallFile() },
        });

        expect(res.statusCode).toBe(200);
      });

      test('Rejects from Content-Length before reading the body', async () => {
        const before = await rq({ method: 'GET', url: `/upload/files/${fileId}` });

        // Well over the envelope margin, so the request is refused at headers
        // time rather than after the replacement has been streamed to disk.
        //
        // The connection is closed without draining the request, so the upload
        // is interrupted mid-send — that is what stops a browser from streaming
        // the whole file. Whether the 413 or the aborted write settles first is
        // a race, and supertest surfaces the write as `EPIPE`, so accept either
        // outcome and assert what matters in both: the replacement never took
        // effect. The unit tests cover the rejection deterministically.
        let res;
        try {
          res = await rq({
            method: 'POST',
            url: `/upload/files/${fileId}/replace`,
            formData: { files: oversizedFile() },
          });
        } catch (err) {
          expect(err.code).toBe('EPIPE');
        }

        if (res) {
          expect(res.statusCode).toBe(413);
          expect(res.body.error.name).toBe('PayloadTooLargeError');
          expect(res.body.error.message).toMatch(/exceeds size limit of/);
        }

        // The stored file is untouched — nothing was replaced.
        const after = await rq({ method: 'GET', url: `/upload/files/${fileId}` });
        expect(after.body.size).toBe(before.body.size);
        expect(after.body.updatedAt).toBe(before.body.updatedAt);
      });
    });

    describe('POST /upload?id=<id>', () => {
      test('Rejects when the replacement file is bigger than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: largeFile() },
        });

        expect(res.statusCode).toBe(413);
      });

      test('Can replace with a file smaller than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: smallFile() },
        });

        expect(res.statusCode).toBe(200);
      });
    });

    describe('POST /api/upload?id=<id> (content API)', () => {
      test('Rejects when the replacement file is bigger than the size limit', async () => {
        const res = await contentAPIRq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: largeFile() },
        });

        expect(res.statusCode).toBe(413);
      });

      test('Can replace with a file smaller than the size limit', async () => {
        const res = await contentAPIRq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: smallFile() },
        });

        expect(res.statusCode).toBe(200);
      });
    });
  });
});
