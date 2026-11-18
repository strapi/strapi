import { createTestBuilder } from 'api-tests/builder';
import { createAuthRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';
import { describeOnCondition } from 'api-tests/utils';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const noteUid = 'api::hidden-main-field-note.hidden-main-field-note';
const noteModel = {
  kind: 'collectionType',
  singularName: 'hidden-main-field-note',
  pluralName: 'hidden-main-field-notes',
  displayName: 'Hidden main field note',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    body: { type: 'string' },
  },
  // The default main field is the first string attribute, here hidden from the admin
  config: {
    attributes: {
      title: { hidden: true },
    },
  },
};

/**
 * A main field hidden with `config.attributes.<field>.hidden` is dropped from the homepage
 * query fields. The widgets still load, and use the document id as the title.
 */
describe('Homepage API - main field hidden in the content type config', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let note;

  beforeAll(async () => {
    await builder.addContentTypes([noteModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    note = await strapi.documents(noteUid).create({
      data: { title: 'Hidden title', body: 'Body' },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('recent documents use the document id as the title', async () => {
    const response = await rq({
      method: 'GET',
      url: '/content-manager/homepage/recent-documents?action=update',
    });

    expect(response.statusCode).toBe(200);

    const recent = response.body.data.find((doc) => doc.documentId === note.documentId);
    expect(recent.title).toBe(note.documentId);
  });

  describeOnCondition(edition === 'EE')('Assigned to me', () => {
    test('recently assigned documents load', async () => {
      const response = await rq({
        method: 'GET',
        url: '/review-workflows/homepage/recently-assigned-documents',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
