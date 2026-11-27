import type { Core } from '@strapi/strapi';

import { createTestBuilder } from 'api-tests/builder';
import { createContentAPIRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';

const builder = createTestBuilder();
const URL = '/custom-status-sorts';

let strapi: Core.Strapi;
let rq: ReturnType<typeof createContentAPIRequest>;

describe('Content API sorting by a custom status field', () => {
  beforeAll(async () => {
    await builder
      .addContentType({
        displayName: 'Custom Status Sort',
        singularName: 'custom-status-sort',
        pluralName: 'custom-status-sorts',
        draftAndPublish: false,
        attributes: {
          title: { type: 'string' },
          status: { type: 'string' },
        },
      })
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });

    // Insert in a different order from either status sort, with a tie for the secondary sort.
    for (const entry of [
      { title: 'Pending', status: 'pending' },
      { title: 'Confirmed first', status: 'confirmed' },
      { title: 'Canceled', status: 'canceled' },
      { title: 'Confirmed second', status: 'confirmed' },
    ]) {
      const res = await rq({ method: 'POST', url: URL, body: { data: entry } });
      expect(res.status).toBe(201);
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test.each([
    ['asc', ['Canceled', 'Confirmed first', 'Confirmed second', 'Pending']],
    ['desc', ['Pending', 'Confirmed first', 'Confirmed second', 'Canceled']],
  ])('sorts by the custom status field in %s order', async (direction, expected) => {
    const res = await rq.get(URL, { qs: { sort: [`status:${direction}`, 'id:asc'] } });

    expect(res.status).toBe(200);
    expect(res.body.data.map((entry: { title: string }) => entry.title)).toEqual(expected);
  });

  test('paginates after sorting by the custom status field', async () => {
    const res = await rq.get(URL, {
      qs: { sort: ['status:asc', 'id:asc'], pagination: { page: 2, pageSize: 2 } },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.map((entry: { title: string }) => entry.title)).toEqual([
      'Confirmed second',
      'Pending',
    ]);
  });
});
