'use strict';

import { createTestBuilder } from 'api-tests/builder';
import { createAuthRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';
import { createUtils } from 'api-tests/utils';

const measureUid = 'api::measure.measure';
const measureModel = {
  kind: 'collectionType',
  collectionName: 'measures',
  singularName: 'measure',
  pluralName: 'measures',
  displayName: 'Measure',
  description: '',
  draftAndPublish: true,
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
 * field value as a string. An empty value returns an empty string, which the widgets render as
 * a translated "Untitled". A main field the user cannot read falls back to the document id.
 */
describe('Homepage API - recent documents title with a non-string main field', () => {
  const builder = createTestBuilder();
  let strapi;
  let utils;
  let rq;
  let restrictedUser;
  let restrictedRole;
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

  const getTitles = async (action: 'update' | 'publish', request = rq) => {
    const response = await request({
      method: 'GET',
      url: `/content-manager/homepage/recent-documents?action=${action}`,
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
    utils = createUtils(strapi);
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
      status: 'published',
    });
    empty = await strapi.documents(measureUid).create({
      data: { name: '' },
      status: 'published',
    });
  });

  afterAll(async () => {
    if (restrictedUser !== undefined) {
      await utils.deleteUsersById([restrictedUser.id]);
    }
    if (restrictedRole !== undefined) {
      await utils.deleteRolesById([restrictedRole.id]);
    }
    await strapi.destroy();
    await builder.cleanup();
  });

  describe.each([
    ['Last edited', 'update'],
    ['Last published', 'publish'],
  ] as const)('%s', (_widget, action) => {
    test.each([
      ['name', 'Filled'],
      ['rank', '42'],
      ['price', '9.5'],
      ['day', '2026-11-09'],
      ['startsAt', '2026-11-09T10:30:00.000Z'],
      ['active', 'false'],
    ])('returns main field %s as a string title', async (mainField, expectedTitle) => {
      await setMainField(mainField);

      const titles = await getTitles(action);

      expect(titles.filled).toBe(expectedTitle);
      // An empty main field value returns an empty title, rendered as "Untitled" by the widgets
      expect(titles.empty).toBe('');
    });
  });

  test('returns the document id when the user cannot read the main field', async () => {
    await setMainField('name');

    restrictedRole = await utils.createRole({
      name: 'role-recent-documents-title',
      description: 'Can read measures without their name',
    });
    await utils.assignPermissionsToRole(restrictedRole.id, [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: measureUid,
        properties: { fields: ['rank'] },
      },
    ]);
    restrictedUser = await utils.createUser({
      firstname: 'restricted',
      lastname: 'User',
      email: 'recent-documents-title.restricted@strapi.io',
      roles: [restrictedRole.id],
    });
    const restrictedRq = await createAuthRequest({ strapi, userInfo: restrictedUser });

    const titles = await getTitles('update', restrictedRq);

    expect(titles.filled).toBe(filled.documentId);
    expect(titles.empty).toBe(empty.documentId);
  });
});
