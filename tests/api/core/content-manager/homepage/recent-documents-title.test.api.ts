'use strict';

import { createTestBuilder } from 'api-tests/builder';
import { createAuthRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';

const measureUid = 'api::measure.measure';
const measureModel = {
  kind: 'collectionType',
  collectionName: 'measures',
  singularName: 'measure',
  pluralName: 'measures',
  displayName: 'Measure',
  description: '',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    rank: { type: 'integer' },
    price: { type: 'decimal' },
    day: { type: 'date' },
    startsAt: { type: 'datetime' },
    active: { type: 'boolean' },
  },
};

/**
 * The recent documents widgets render `title` as text. The configured main field can be any
 * listable attribute (integer, decimal, date, boolean…), so the endpoint must return the main
 * field value as a string, and fall back to the document id when the value is empty.
 */
describe('Homepage API - recent documents title with a non-string main field', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let filled;
  let empty;

  const setMainField = async (mainField: string) => {
    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/content-types/${measureUid}/configuration`,
    });
    const { bulkable, filterable, pageSize, searchable } = body.data.contentType.settings;

    const response = await rq({
      method: 'PUT',
      url: `/content-manager/content-types/${measureUid}/configuration`,
      body: { settings: { bulkable, filterable, pageSize, searchable, mainField } },
    });
    expect(response.statusCode).toBe(200);
  };

  const getTitles = async () => {
    const response = await rq({
      method: 'GET',
      url: '/content-manager/homepage/recent-documents?action=update',
    });
    expect(response.statusCode).toBe(200);

    const byDocumentId = new Map<string, unknown>(
      response.body.data.map((doc) => [doc.documentId, doc.title])
    );

    return {
      filled: byDocumentId.get(filled.documentId),
      empty: byDocumentId.get(empty.documentId),
    };
  };

  beforeAll(async () => {
    await builder.addContentTypes([measureModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    filled = await strapi.documents(measureUid).create({
      data: {
        name: 'Filled',
        rank: 42,
        price: 9.5,
        day: '2026-11-09',
        startsAt: '2026-11-09T10:30:00.000Z',
        active: false,
      },
    });
    empty = await strapi.documents(measureUid).create({ data: { name: '' } });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test.each([
    ['name', 'Filled'],
    ['rank', '42'],
    ['price', '9.5'],
    ['day', '2026-11-09'],
    ['startsAt', '2026-11-09T10:30:00.000Z'],
    ['active', 'false'],
  ])('returns main field %s as a string title', async (mainField, expectedTitle) => {
    await setMainField(mainField);

    const titles = await getTitles();

    expect(titles.filled).toBe(expectedTitle);
    // An empty main field value falls back to the document id
    expect(titles.empty).toBe(empty.documentId);
  });
});
