'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const models = {
  related: {
    displayName: 'dz-null-related',
    singularName: 'dz-null-related',
    pluralName: 'dz-null-relateds',
    attributes: {
      name: {
        type: 'string',
        required: true,
      },
    },
  },
  ticketCard: {
    displayName: 'dz-null-ticket-card',
    attributes: {
      valuePerPerson: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::dz-null-related.dz-null-related',
      },
    },
  },
  richText: {
    displayName: 'dz-null-rich-text',
    attributes: {
      body: {
        type: 'text',
      },
    },
  },
  ct: {
    displayName: 'withdznullentry',
    singularName: 'withdznullentry',
    pluralName: 'withdznullentries',
    attributes: {
      title: {
        type: 'string',
      },
      content: {
        type: 'dynamiczone',
        components: ['default.dz-null-rich-text', 'default.dz-null-ticket-card'],
      },
    },
  },
};

describe('CM API - null dynamic zone entry', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentType(models.related)
      .addComponent(models.richText)
      .addComponent(models.ticketCard)
      .addContentType(models.ct)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    rq.setURLPrefix('/content-manager/collection-types/api::withdznullentry.withdznullentry');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('create returns validation error when a dynamic zone slot is null (#24303)', async () => {
    const res = await rq({
      method: 'POST',
      url: '/',
      body: {
        title: 'Museum structure',
        content: [
          null,
          {
            __component: 'default.dz-null-rich-text',
            body: 'Intro',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        details: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: ['content', '0'],
              name: 'ValidationError',
              message: 'content[0] must be a `object` type, but the final value was: `null`.',
            }),
          ]),
        },
      },
    });
  });

  test('update returns validation error when a dynamic zone slot is null (#24303)', async () => {
    const createRes = await rq({
      method: 'POST',
      url: '/',
      body: {
        title: 'Seed entry',
        content: [
          {
            __component: 'default.dz-null-rich-text',
            body: 'Seed',
          },
        ],
      },
    });

    expect(createRes.statusCode).toBe(201);

    const res = await rq({
      method: 'PUT',
      url: `/${createRes.body.data.documentId}`,
      body: {
        title: 'Museum structure',
        content: [
          null,
          {
            __component: 'default.dz-null-ticket-card',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        details: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: ['content', '0'],
              name: 'ValidationError',
              message: 'content[0] must be a `object` type, but the final value was: `null`.',
            }),
          ]),
        },
      },
    });
  });
});
