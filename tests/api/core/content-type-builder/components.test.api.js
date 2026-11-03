'use strict';

const fs = require('fs');
const path = require('path');

const { createAuthRequest, createContentAPIRequest } = require('api-tests/request');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

describe('Content Type Builder - Components', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('POST /components', () => {
    test('Validates input and return 400 in case of invalid input', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {},
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: {
          details: {
            errors: [
              {
                message: 'attributes.required',
                name: 'ValidationError',
                path: ['component', 'attributes'],
              },
              {
                message: 'displayName.required',
                name: 'ValidationError',
                path: ['component', 'displayName'],
              },
              {
                message: 'category.required',
                name: 'ValidationError',
                path: ['component', 'category'],
              },
            ],
          },
          message: '3 errors occurred',
          name: 'ValidationError',
        },
      });
    });

    test('Creates a component properly', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {
            category: 'default',
            displayName: 'Some Component',
            icon: 'calendar',
            pluginOptions: {
              pluginName: {
                option: true,
              },
            },
            attributes: {
              title: {
                type: 'string',
                pluginOptions: {
                  pluginName: {
                    option: true,
                  },
                },
              },
              pic: {
                type: 'media',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        data: {
          uid: 'default.some-component',
        },
      });

      await restart();
    });

    test('Errors on already existing components', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {
            category: 'default',
            icon: 'calendar',
            displayName: 'someComponent',
            attributes: {},
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: 'component.alreadyExists',
      });
    });
  });

  describe('Get /components', () => {
    test('Returns valid enveloppe', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/components',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: expect.any(Array),
      });

      res.body.data.forEach((el) => {
        expect(el).toMatchObject({
          uid: expect.any(String),
          schema: expect.objectContaining({
            displayName: expect.any(String),
            description: expect.any(String),
            collectionName: expect.any(String),
            attributes: expect.objectContaining({}),
          }),
        });
      });
    });
  });

  describe('GET /components/:uid', () => {
    test('Returns 404 on not found', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/components/nonexistent-component',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: 'component.notFound',
      });
    });

    test('Returns correct format', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          uid: 'default.some-component',
          category: 'default',
          schema: {
            displayName: 'Some Component',
            icon: 'calendar',
            description: '',
            collectionName: 'components_default_some_components',
            pluginOptions: {
              pluginName: {
                option: true,
              },
            },
            attributes: {
              title: {
                type: 'string',
                pluginOptions: {
                  pluginName: {
                    option: true,
                  },
                },
              },
              pic: {
                type: 'media',
                multiple: false,
                required: false,
              },
            },
          },
        },
      });
    });
  });

  describe('PUT /components/:uid', () => {
    test('Throws 404 on updating non existent component', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/nonexistent-components',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: 'component.notFound',
      });
    });

    test('Validates input and return 400 in case of invalid input', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/default.some-component',
        body: {
          component: {
            attributes: {},
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: {
          details: {
            errors: [
              {
                message: 'displayName.required',
                name: 'ValidationError',
                path: ['component', 'displayName'],
              },
              {
                message: 'category.required',
                name: 'ValidationError',
                path: ['component', 'category'],
              },
            ],
          },
          message: '2 errors occurred',
          name: 'ValidationError',
        },
      });
    });

    test('Updates a component properly', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/default.some-component',
        body: {
          component: {
            category: 'default',
            icon: 'calendar',
            displayName: 'New Component',
            attributes: {
              name: {
                type: 'string',
              },
            },
            pluginOptions: {
              pluginName: {
                option: false,
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          uid: 'default.some-component',
        },
      });

      await restart();

      const getRes = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject({
        data: {
          uid: 'default.some-component',
          schema: {
            displayName: 'New Component',
            pluginOptions: {
              pluginName: {
                option: false,
              },
            },
          },
        },
      });
    });
  });

  describe('DELETE /components/:uid', () => {
    test('Throws 404 on non existent component', async () => {
      const res = await rq({
        method: 'DELETE',
        url: '/content-type-builder/components/nonexistent-components',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: 'component.notFound',
      });
    });

    test('Deletes a component correctly', async () => {
      const res = await rq({
        method: 'DELETE',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          uid: 'default.some-component',
        },
      });

      await restart();

      const tryGet = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(tryGet.statusCode).toBe(404);
      expect(tryGet.body).toEqual({
        error: 'component.notFound',
      });
    });
  });

  describe('Moving a component to another category keeps its entries', () => {
    const PAGE_UID = 'api::page.page';
    const CARD = {
      displayName: 'Card',
      icon: 'calendar',
      attributes: {
        title: { type: 'string' },
        image: { type: 'media', multiple: false, allowedTypes: ['images'] },
      },
    };

    let contentApi;
    let file;

    const updateSchema = (data) =>
      rq({ method: 'POST', url: '/content-type-builder/update-schema', body: { data } });

    const componentTypes = async (tableName) =>
      strapi.db.getConnection(tableName).pluck('component_type');

    const uploadImage = async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../upload/utils/rec.jpg')),
        },
      });
      expect(res.statusCode).toBe(201);
      return res.body[0];
    };

    beforeAll(async () => {
      // card nested in a wrapper component, and used both in a dynamic zone and as a single component
      const res = await updateSchema({
        components: [
          {
            action: 'create',
            uid: 'default.card',
            category: 'default',
            displayName: CARD.displayName,
            icon: CARD.icon,
            attributes: Object.entries(CARD.attributes).map(([name, properties]) => ({
              action: 'create',
              name,
              properties,
            })),
          },
          {
            action: 'create',
            uid: 'default.wrapper',
            category: 'default',
            displayName: 'Wrapper',
            icon: 'calendar',
            attributes: [
              {
                action: 'create',
                name: 'inner',
                properties: { type: 'component', repeatable: false, component: 'default.card' },
              },
            ],
          },
        ],
        contentTypes: [
          {
            action: 'create',
            uid: PAGE_UID,
            displayName: 'Page',
            singularName: 'page',
            pluralName: 'pages',
            kind: 'collectionType',
            draftAndPublish: false,
            attributes: [
              {
                action: 'create',
                name: 'sections',
                properties: {
                  type: 'dynamiczone',
                  components: ['default.card', 'default.wrapper'],
                },
              },
              {
                action: 'create',
                name: 'hero',
                properties: { type: 'component', repeatable: false, component: 'default.card' },
              },
            ],
          },
        ],
      });
      expect(res.statusCode).toBe(200);

      await restart();
      contentApi = createContentAPIRequest({ strapi });

      file = await uploadImage();

      const created = await contentApi({
        method: 'POST',
        url: '/pages',
        body: {
          data: {
            sections: [
              { __component: 'default.card', title: 'A', image: file.id },
              { __component: 'default.wrapper', inner: { title: 'I', image: file.id } },
            ],
            hero: { title: 'H', image: file.id },
          },
        },
      });
      expect(created.statusCode).toBe(201);
    });

    afterAll(async () => {
      await updateSchema({
        contentTypes: [{ action: 'delete', uid: PAGE_UID }],
        components: [
          { action: 'delete', uid: 'blocks.card' },
          { action: 'delete', uid: 'default.wrapper' },
        ],
      });

      if (file) {
        await rq({ method: 'DELETE', url: `/upload/files/${file.id}` });
      }
    });

    test('the dynamic zone and component rows follow the new uid', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/default.card',
        body: { component: { ...CARD, category: 'blocks' } },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ data: { uid: 'blocks.card' } });

      await restart();
      contentApi = createContentAPIRequest({ strapi });

      const pageTable = strapi.db.metadata.get(PAGE_UID).attributes.sections.joinTable.name;
      const wrapperTable =
        strapi.db.metadata.get('default.wrapper').attributes.inner.joinTable.name;

      expect((await componentTypes(pageTable)).sort()).toEqual([
        'blocks.card',
        'blocks.card',
        'default.wrapper',
      ]);
      expect(await componentTypes(wrapperTable)).toEqual(['blocks.card']);

      const { statusCode, body } = await contentApi({
        method: 'GET',
        url: '/pages',
        qs: { populate: '*' },
      });

      expect(statusCode).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].sections).toEqual([
        expect.objectContaining({ __component: 'blocks.card', title: 'A' }),
        expect.objectContaining({ __component: 'default.wrapper' }),
      ]);
      expect(body.data[0].hero).toMatchObject({ title: 'H' });
    });

    test('the media links of the moved component follow the new uid', async () => {
      // the previous test moved the card and restarted
      const morphTable = strapi.db.metadata.get('plugin::upload.file').attributes.related.joinTable;
      const typeColumn = morphTable.morphColumn.typeColumn.name;

      const relatedTypes = await strapi.db.getConnection(morphTable.name).pluck(typeColumn);
      expect(relatedTypes).not.toContain('default.card');
      expect(relatedTypes.filter((type) => type === 'blocks.card')).toHaveLength(3);

      const { statusCode, body } = await contentApi({
        method: 'GET',
        url: '/pages',
        qs: {
          populate: {
            sections: {
              on: {
                'blocks.card': { populate: '*' },
                'default.wrapper': { populate: { inner: { populate: '*' } } },
              },
            },
            hero: { populate: '*' },
          },
        },
      });

      expect(statusCode).toBe(200);
      const [page] = body.data;
      const image = expect.objectContaining({ id: file.id });

      expect(page.sections[0]).toMatchObject({ __component: 'blocks.card', title: 'A' });
      expect(page.sections[0].image).toEqual(image);
      expect(page.sections[1].inner).toMatchObject({ title: 'I' });
      expect(page.sections[1].inner.image).toEqual(image);
      expect(page.hero).toMatchObject({ title: 'H' });
      expect(page.hero.image).toEqual(image);
    });
  });
});
