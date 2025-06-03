'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

let strapi;
let rq;
let baseRq;

const uploadImg = () => {
  return baseRq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
    },
  });
};

const components = {
  singleMedia: {
    displayName: 'one-media',
    attributes: {
      media: {
        type: 'media',
      },
    },
  },
  multipleMedia: {
    displayName: 'many-media',
    attributes: {
      media: {
        type: 'media',
        multiple: true,
      },
    },
  },
  withNested: {
    displayName: 'with-nested',
    attributes: {
      singleMedia: {
        type: 'component',
        component: 'default.one-media',
      },
      multipleMedia: {
        type: 'component',
        component: 'default.many-media',
      },
    },
  },
};

const ct = {
  displayName: 'withdynamiczonemedia',
  singularName: 'withdynamiczonemedia',
  pluralName: 'withdynamiczonemedias',
  attributes: {
    field: {
      type: 'dynamiczone',
      components: ['default.one-media', 'default.many-media', 'default.with-nested'],
    },
  },
};

describe('Not required dynamiczone', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addComponent(components.singleMedia)
      .addComponent(components.multipleMedia)
      .addComponent(components.withNested)
      .addContentType(ct)
      .build();

    strapi = await createStrapiInstance();

    baseRq = await createContentAPIRequest({ strapi });

    rq = await createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/withdynamiczonemedias');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Contains components with medias', () => {
    test('The medias are correctly related to the components on creation', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(201);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: [
              {
                __component: 'default.one-media',
                media: mediaId,
              },
              {
                __component: 'default.many-media',
                media: [mediaId, mediaId],
              },
            ],
          },
        },
        qs: {
          populate: ['field.media'],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.one-media',
            media: {
              id: mediaId,
              url: expect.any(String),
            },
          },
          {
            id: expect.anything(),
            __component: 'default.many-media',
            media: [
              {
                id: mediaId,
                url: expect.any(String),
              },
            ],
          },
        ],
      });
    });

    test('The medias are correctly related to the components on edition', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(201);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: [
              {
                __component: 'default.one-media',
                media: mediaId,
              },
              {
                __component: 'default.many-media',
                media: [mediaId, mediaId],
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body.data.field)).toBe(true);

      const newImgRes = await uploadImg();

      expect(newImgRes.statusCode).toBe(201);
      const newMediaId = newImgRes.body[0].id;
      const updateRes = await rq({
        method: 'PUT',
        url: `/${res.body.data.documentId}`,
        body: {
          data: {
            field: [
              {
                __component: 'default.one-media',
                media: newMediaId,
              },
              {
                __component: 'default.many-media',
                media: [newMediaId, newMediaId],
              },
            ],
          },
        },
        qs: {
          populate: ['field.media'],
        },
      });

      expect(updateRes.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.one-media',
            media: {
              id: newMediaId,
              url: expect.any(String),
            },
          },
          {
            id: expect.anything(),
            __component: 'default.many-media',
            media: [
              {
                id: newMediaId,
                url: expect.any(String),
              },
            ],
          },
        ],
      });
    });

    test('The media are populated on the components', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(201);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: [
              {
                __component: 'default.one-media',
                media: mediaId,
              },
              {
                __component: 'default.many-media',
                media: [mediaId, mediaId],
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(201);

      const getRes = await rq({
        method: 'GET',
        url: `/${res.body.data.documentId}`,
        qs: {
          populate: ['field.media'],
        },
      });

      expect(getRes.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.one-media',
            media: {
              id: mediaId,
              url: expect.any(String),
            },
          },
          {
            id: expect.anything(),
            __component: 'default.many-media',
            media: [
              {
                id: mediaId,
                url: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });

  describe('Contains components with nested components having medias', () => {
    test('The medias are correctly related to the nested components on creation', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(201);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: [
              {
                __component: 'default.with-nested',
                singleMedia: {
                  media: mediaId,
                },
                multipleMedia: {
                  media: [mediaId, mediaId],
                },
              },
            ],
          },
        },
        qs: {
          populate: ['field.singleMedia.media', 'field.multipleMedia.media'],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.with-nested',
            singleMedia: {
              media: {
                id: mediaId,
                url: expect.any(String),
              },
            },
            multipleMedia: {
              media: [
                {
                  id: mediaId,
                  url: expect.any(String),
                },
              ],
            },
          },
        ],
      });
    });
  });
});
