'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const uploadFile = (rq, filename = 'rec.jpg') =>
  rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      fileInfo: JSON.stringify({ name: filename }),
    },
  });

describe('Upload content API - GET /upload/files/page (pagination)', () => {
  const uploadedIds = [];

  beforeAll(async () => {
    await builder.build();
    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });

    // Seed a few files so pagination has something to slice.
    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await uploadFile(rq, `paginated-${i}.jpg`);
      uploadedIds.push(res.body[0].id);
    }
  });

  afterAll(async () => {
    await Promise.all(
      uploadedIds.map((id) => rq({ method: 'DELETE', url: `/upload/files/${id}` }))
    );
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns the { data, meta: { pagination } } envelope', async () => {
    const res = await rq({ method: 'GET', url: '/upload/files/page' });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: expect.any(Number),
        pageCount: expect.any(Number),
        total: expect.any(Number),
      })
    );
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(5);
  });

  test('honors pagination[pageSize] and pagination[page]', async () => {
    const res = await rq({
      method: 'GET',
      url: '/upload/files/page',
      qs: { pagination: { page: 1, pageSize: 2 } },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.pagination).toEqual(expect.objectContaining({ page: 1, pageSize: 2 }));

    const page2 = await rq({
      method: 'GET',
      url: '/upload/files/page',
      qs: { pagination: { page: 2, pageSize: 2 } },
    });

    expect(page2.statusCode).toBe(200);
    expect(page2.body.meta.pagination.page).toBe(2);
    // The two pages must not overlap.
    const ids1 = res.body.data.map((f) => f.id);
    const ids2 = page2.body.data.map((f) => f.id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
  });

  test('honors offset-based pagination[start]/pagination[limit]', async () => {
    const res = await rq({
      method: 'GET',
      url: '/upload/files/page',
      qs: { pagination: { start: 0, limit: 3 } },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.pagination).toEqual(
      expect.objectContaining({ start: 0, limit: 3, total: expect.any(Number) })
    );
  });

  test('omits total/pageCount when pagination[withCount]=false', async () => {
    const res = await rq({
      method: 'GET',
      url: '/upload/files/page',
      qs: { pagination: { page: 1, pageSize: 2, withCount: false } },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.pagination).not.toHaveProperty('total');
    expect(res.body.meta.pagination).not.toHaveProperty('pageCount');
  });

  test('the legacy GET /upload/files endpoint still returns a flat array', async () => {
    const res = await rq({ method: 'GET', url: '/upload/files' });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).not.toHaveProperty('meta');
  });
});
