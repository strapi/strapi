'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const UID = 'api::password-publish.password-publish';

const passwordContentType = {
  displayName: 'password-publish',
  singularName: 'password-publish',
  pluralName: 'password-publishes',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    secret: {
      type: 'password',
      required: true,
      maxLength: 20,
    },
  },
};

describe('password validation when copying draft/published entries', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const createEntry = (body) =>
    rq.post(`/content-manager/collection-types/${UID}`, {
      body,
    });

  const publishEntry = (documentId) =>
    rq.post(`/content-manager/collection-types/${UID}/${documentId}/actions/publish`);

  beforeAll(async () => {
    await builder.addContentType(passwordContentType).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterEach(async () => {
    await strapi.db.query(UID).deleteMany({});
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('publishing validates the plaintext length once and preserves the stored password hash', async () => {
    const plaintext = 'short-password';
    expect(plaintext.length).toBeLessThanOrEqual(passwordContentType.attributes.secret.maxLength);

    const creation = await createEntry({ title: 'Draft', secret: plaintext });
    expect(creation.statusCode).toBe(201);

    const { documentId } = creation.body.data;
    const draft = await strapi.db.query(UID).findOne({
      where: { documentId, publishedAt: null },
      select: ['id', 'secret'],
    });

    expect(draft.secret).not.toBe(plaintext);
    expect(draft.secret.length).toBeGreaterThan(passwordContentType.attributes.secret.maxLength);

    const publish = await publishEntry(documentId);
    expect(publish.statusCode).toBe(200);

    const published = await strapi.db.query(UID).findOne({
      where: { documentId, publishedAt: { $notNull: true } },
      select: ['id', 'secret'],
    });

    expect(published.secret).toBe(draft.secret);

    await strapi.documents(UID).discardDraft({ documentId });

    const replacedDraft = await strapi.db.query(UID).findOne({
      where: { documentId, publishedAt: null },
      select: ['id', 'secret'],
    });

    expect(replacedDraft.secret).toBe(published.secret);
  });

  test('still rejects user-supplied plaintext that exceeds maxLength', async () => {
    const creation = await createEntry({ title: 'Too long', secret: 'x'.repeat(21) });
    expect(creation.statusCode).toBe(400);
  });
});
