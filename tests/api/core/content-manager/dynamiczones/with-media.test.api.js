'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

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
    displayName: 'single-media',
    attributes: {
      media: {
        type: 'media',
      },
    },
  },
  multipleMedia: {
    displayName: 'multiple-media',
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
        component: 'default.single-media',
      },
      multipleMedia: {
        type: 'component',
        component: 'default.multiple-media',
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
      components: ['default.single-media', 'default.multiple-media', 'default.with-nested'],
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

    baseRq = await createAuthRequest({ strapi });

    rq = await createAuthRequest({ strapi });
    rq.setURLPrefix(
      '/content-manager/collection-types/api::withdynamiczonemedia.withdynamiczonemedia'
    );
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Contains components with medias', () => {
    test('The medias are correctly related to the components on creation', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(200);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          field: [
            {
              __component: 'default.single-media',
              media: mediaId,
            },
            {
              __component: 'default.multiple-media',
              media: [mediaId, mediaId],
            },
          ],
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.single-media',
            media: {
              id: mediaId,
              url: expect.any(String),
            },
          },
          {
            id: expect.anything(),
            __component: 'default.multiple-media',
            media: expect.arrayContaining([
              expect.objectContaining({
                id: mediaId,
                url: expect.any(String),
              }),
            ]),
          },
        ],
      });
    });

    test('The medias are correctly related to the components on edition', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(200);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          field: [
            {
              __component: 'default.single-media',
              media: mediaId,
            },
            {
              __component: 'default.multiple-media',
              media: [mediaId, mediaId],
            },
          ],
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);

      const newImgRes = await uploadImg();

      expect(newImgRes.statusCode).toBe(200);
      const newMediaId = newImgRes.body[0].id;
      const updateRes = await rq({
        method: 'PUT',
        url: `/${res.body.id}`,
        body: {
          field: [
            {
              __component: 'default.single-media',
              media: newMediaId,
            },
            {
              __component: 'default.multiple-media',
              media: [newMediaId, newMediaId],
            },
          ],
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.body).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.single-media',
            media: {
              id: newMediaId,
              url: expect.any(String),
            },
          },
          {
            id: expect.anything(),
            __component: 'default.multiple-media',
            media: expect.arrayContaining([
              expect.objectContaining({
                id: newMediaId,
                url: expect.any(String),
              }),
            ]),
          },
        ],
      });
    });

    test('The media are populated on the components', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(200);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          field: [
            {
              __component: 'default.single-media',
              media: mediaId,
            },
            {
              __component: 'default.multiple-media',
              media: [mediaId, mediaId],
            },
          ],
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);

      const getRes = await rq({
        method: 'GET',
        url: `/${res.body.id}`,
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.body).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.single-media',
            media: {
              id: mediaId,
              url: expect.any(String),
            },
          },
          {
            id: expect.anything(),
            __component: 'default.multiple-media',
            media: expect.arrayContaining([
              expect.objectContaining({
                id: mediaId,
                url: expect.any(String),
              }),
            ]),
          },
        ],
      });
    });
  });

  describe('Contains components with nested components having medias', () => {
    test('The medias are correctly related to the nested components on creation', async () => {
      const imgRes = await uploadImg();

      expect(imgRes.statusCode).toBe(200);
      const mediaId = imgRes.body[0].id;

      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
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
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body).toMatchObject({
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
              media: expect.arrayContaining([
                expect.objectContaining({
                  id: mediaId,
                  url: expect.any(String),
                }),
              ]),
            },
          },
        ],
      });
    });
  });
});
