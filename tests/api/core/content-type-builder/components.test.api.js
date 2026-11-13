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

const CARD = {
  displayName: 'Card',
  icon: 'calendar',
  attributes: {
    title: { type: 'string' },
    image: { type: 'media', multiple: false, allowedTypes: ['images'] },
  },
};

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

const putComponent = (uid, body) =>
  rq({ method: 'PUT', url: `/content-type-builder/components/${uid}`, body });

const getComponent = (uid) => rq({ method: 'GET', url: `/content-type-builder/components/${uid}` });

const componentPath = (category, name) =>
  path.join(strapi.dirs.app.components, category, `${name}.json`);

const readComponentFile = (category, name) =>
  JSON.parse(fs.readFileSync(componentPath(category, name), 'utf8'));

const createAttributes = (attributes) =>
  Object.entries(attributes).map(([name, properties]) => ({ action: 'create', name, properties }));

/**
 * Creates `<category>.card` (title + image), `<category>.wrapper` (nests a card) and a page
 * collection type with a dynamic zone (card + wrapper) and a single `hero` card, then seeds
 * one page through the content API with an image on every card. Each caller passes its own
 * category and page names, so that fixtures never collide.
 */
const seedPageWithCard = async ({ category, singularName, pluralName }) => {
  const fixture = {
    pageUid: `api::${singularName}.${singularName}`,
    pluralName,
    cardUid: `${category}.card`,
    wrapperUid: `${category}.wrapper`,
  };

  const res = await updateSchema({
    components: [
      {
        action: 'create',
        uid: fixture.cardUid,
        category,
        displayName: CARD.displayName,
        icon: CARD.icon,
        attributes: createAttributes(CARD.attributes),
      },
      {
        action: 'create',
        uid: fixture.wrapperUid,
        category,
        displayName: 'Wrapper',
        icon: 'calendar',
        attributes: createAttributes({
          inner: { type: 'component', repeatable: false, component: fixture.cardUid },
        }),
      },
    ],
    contentTypes: [
      {
        action: 'create',
        uid: fixture.pageUid,
        displayName: singularName,
        singularName,
        pluralName,
        kind: 'collectionType',
        draftAndPublish: false,
        attributes: createAttributes({
          sections: {
            type: 'dynamiczone',
            components: [fixture.cardUid, fixture.wrapperUid],
          },
          hero: { type: 'component', repeatable: false, component: fixture.cardUid },
        }),
      },
    ],
  });
  expect(res.statusCode).toBe(200);

  await restart();

  fixture.file = await uploadImage();

  const created = await createContentAPIRequest({ strapi })({
    method: 'POST',
    url: `/${pluralName}`,
    body: {
      data: {
        sections: [
          { __component: fixture.cardUid, title: 'A', image: fixture.file.id },
          { __component: fixture.wrapperUid, inner: { title: 'I', image: fixture.file.id } },
        ],
        hero: { title: 'H', image: fixture.file.id },
      },
    },
  });
  expect(created.statusCode).toBe(201);

  return fixture;
};

/**
 * Asserts on the real tables that every stored reference to the card and the wrapper uses
 * `cardUid` / `wrapperUid`, that none uses `staleCardUid`, and that the page and every card
 * image still resolve through the content API.
 */
const expectPageOn = async (
  { pageUid, pluralName, file },
  { cardUid, wrapperUid, staleCardUid }
) => {
  const pageTable = strapi.db.metadata.get(pageUid).attributes.sections.joinTable.name;
  const wrapperTable = strapi.db.metadata.get(wrapperUid).attributes.inner.joinTable.name;

  expect((await componentTypes(pageTable)).sort()).toEqual([cardUid, cardUid, wrapperUid].sort());
  expect(await componentTypes(wrapperTable)).toEqual([cardUid]);

  const morphTable = strapi.db.metadata.get('plugin::upload.file').attributes.related.joinTable;
  const relatedTypes = await strapi.db
    .getConnection(morphTable.name)
    .pluck(morphTable.morphColumn.typeColumn.name);

  expect(relatedTypes.filter((type) => type === cardUid)).toHaveLength(3);
  expect(relatedTypes).not.toContain(staleCardUid);

  const { statusCode, body } = await createContentAPIRequest({ strapi })({
    method: 'GET',
    url: `/${pluralName}`,
    qs: {
      populate: {
        sections: {
          on: {
            [cardUid]: { populate: '*' },
            [wrapperUid]: { populate: { inner: { populate: '*' } } },
          },
        },
        hero: { populate: '*' },
      },
    },
  });

  expect(statusCode).toBe(200);
  expect(body.data).toHaveLength(1);

  const [page] = body.data;
  const image = expect.objectContaining({ id: file.id });

  expect(page.sections).toHaveLength(2);
  expect(page.sections[0]).toMatchObject({ __component: cardUid, title: 'A' });
  expect(page.sections[0].image).toEqual(image);
  expect(page.sections[1]).toMatchObject({ __component: wrapperUid });
  expect(page.sections[1].inner).toMatchObject({ title: 'I' });
  expect(page.sections[1].inner.image).toEqual(image);
  expect(page.hero).toMatchObject({ title: 'H' });
  expect(page.hero.image).toEqual(image);
};

/**
 * Deletes what `seedPageWithCard` created, under the uids the components ended with, then
 * restarts so the next describe starts from a registry without them.
 */
const deleteFixture = async ({ pageUid, file }, componentUids) => {
  await updateSchema({
    contentTypes: [{ action: 'delete', uid: pageUid }],
    components: componentUids.map((uid) => ({ action: 'delete', uid })),
  });

  if (file) {
    await rq({ method: 'DELETE', url: `/upload/files/${file.id}` });
  }

  await restart();
};

/**
 * The update-schema payload that moves `uid` to `category` and keeps its attributes.
 */
const moveComponentPayload = (uid, category, attributes) => ({
  action: 'update',
  uid,
  category,
  displayName: CARD.displayName,
  icon: CARD.icon,
  attributes: Object.entries(attributes).map(([name, properties]) => ({
    action: 'update',
    name,
    properties,
  })),
});

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

    test('Returns a validation error when the attributes are missing', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/default.some-component',
        body: {
          component: {
            category: '',
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: {
          name: 'ValidationError',
          details: {
            errors: expect.arrayContaining([
              expect.objectContaining({
                path: ['component', 'attributes'],
                message: 'attributes.required',
              }),
            ]),
          },
        },
      });
    });

    test('Returns a validation error when the attributes are not an object', async () => {
      const res = await putComponent('default.some-component', {
        component: {
          category: 'default',
          displayName: 'Some Component',
          icon: 'calendar',
          attributes: 'not-an-object',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ValidationError',
        details: { errors: [expect.objectContaining({ path: ['component', 'attributes'] })] },
      });
    });

    test.each([
      ['a null attribute', { foo: null }],
      ['an array with a null attribute', [null]],
    ])('Returns a validation error for %s', async (_label, attributes) => {
      const res = await putComponent('default.some-component', {
        component: {
          category: 'default',
          displayName: 'Some Component',
          icon: 'calendar',
          attributes,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({ name: 'ValidationError' });
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

    let contentApi;
    let file;

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

      // the describes below build their schema from a registry without these
      await restart();
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

  describe('Moving a component through update-schema keeps its entries', () => {
    let fixture;

    beforeAll(async () => {
      fixture = await seedPageWithCard({
        category: 'schemamove',
        singularName: 'schemamove-page',
        pluralName: 'schemamove-pages',
      });
    });

    afterAll(async () => {
      await deleteFixture(fixture, ['schemamoved.card', fixture.wrapperUid]);
    });

    test('the rows and the media links follow the new uid', async () => {
      const res = await updateSchema({
        components: [moveComponentPayload(fixture.cardUid, 'schemamoved', CARD.attributes)],
      });
      expect(res.statusCode).toBe(200);

      await restart();

      await expectPageOn(fixture, {
        cardUid: 'schemamoved.card',
        wrapperUid: fixture.wrapperUid,
        staleCardUid: fixture.cardUid,
      });
    });
  });

  describe('Renaming a component category keeps the entries of its components', () => {
    let fixture;

    beforeAll(async () => {
      fixture = await seedPageWithCard({
        category: 'catold',
        singularName: 'catrename-page',
        pluralName: 'catrename-pages',
      });
    });

    afterAll(async () => {
      await deleteFixture(fixture, ['catnew.card', 'catnew.wrapper']);
    });

    test('the rows and the media links of every component of the category follow the new uids', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/component-categories/catold',
        body: { name: 'catnew' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ name: 'catnew' });

      await restart();

      await expectPageOn(fixture, {
        cardUid: 'catnew.card',
        wrapperUid: 'catnew.wrapper',
        staleCardUid: fixture.cardUid,
      });

      const wrapperTypes = await componentTypes(
        strapi.db.metadata.get(fixture.pageUid).attributes.sections.joinTable.name
      );
      expect(wrapperTypes).not.toContain(fixture.wrapperUid);
    });
  });

  describe('A save that fails after the row rewrite keeps rows and files on the old uid', () => {
    const MOVED_CATEGORY = 'failmoved';
    const EXTRA_UID = 'failsrc.extra';
    let fixture;
    let groupsPath;
    let originalGroups;

    // Replaces groups.json with a directory, so the folder commit fails with EISDIR. Does
    // not depend on file modes, which root (CI) ignores.
    const breakGroupsFile = async () => {
      groupsPath = path.join(strapi.dirs.app.contentStructure, 'groups.json');
      originalGroups = fs.existsSync(groupsPath) ? fs.readFileSync(groupsPath) : null;
      fs.rmSync(groupsPath, { recursive: true, force: true });
      fs.mkdirSync(groupsPath, { recursive: true });
    };

    const restoreGroupsFile = () => {
      if (!groupsPath) {
        return;
      }

      fs.rmSync(groupsPath, { recursive: true, force: true });

      if (originalGroups) {
        fs.writeFileSync(groupsPath, originalGroups);
      }

      groupsPath = undefined;
    };

    beforeAll(async () => {
      fixture = await seedPageWithCard({
        category: 'failsrc',
        singularName: 'failed-page',
        pluralName: 'failed-pages',
      });
    });

    afterEach(() => {
      restoreGroupsFile();
    });

    afterAll(async () => {
      restoreGroupsFile();
      await deleteFixture(fixture, [fixture.cardUid, fixture.wrapperUid, EXTRA_UID]);
    });

    test('a failed folder commit rolls the rows back with the files', async () => {
      const schema = await rq({ method: 'GET', url: '/content-type-builder/schema' });
      expect(schema.statusCode).toBe(200);

      // Sending the folder structure makes `commitFromUpdate` write groups.json.
      const contentStructure = schema.body.data.contentStructure ?? {
        version: 1,
        sections: { collectionTypes: { groups: [] }, singleTypes: { groups: [] } },
      };

      await breakGroupsFile();

      const res = await updateSchema({
        components: [moveComponentPayload(fixture.cardUid, MOVED_CATEGORY, CARD.attributes)],
        contentStructure,
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);

      // No restart: the files were restored to the old category...
      expect(fs.existsSync(path.join(strapi.dirs.app.components, 'failsrc', 'card.json'))).toBe(
        true
      );
      expect(
        fs.existsSync(path.join(strapi.dirs.app.components, MOVED_CATEGORY, 'card.json'))
      ).toBe(false);

      // ...and every row still holds the old uid.
      await expectPageOn(fixture, {
        cardUid: fixture.cardUid,
        wrapperUid: fixture.wrapperUid,
        staleCardUid: `${MOVED_CATEGORY}.card`,
      });
    });

    test('the next boot that syncs a schema change keeps the entries', async () => {
      // An unrelated schema change, so the next boot syncs the schema and removes orphan
      // component and media rows.
      const res = await updateSchema({
        components: [
          {
            action: 'create',
            uid: EXTRA_UID,
            category: 'failsrc',
            displayName: 'Extra',
            icon: 'calendar',
            attributes: createAttributes({ label: { type: 'string' } }),
          },
        ],
      });
      expect(res.statusCode).toBe(200);

      await restart();

      await expectPageOn(fixture, {
        cardUid: fixture.cardUid,
        wrapperUid: fixture.wrapperUid,
        staleCardUid: `${MOVED_CATEGORY}.card`,
      });
    });
  });

  describe('PUT /components/:uid with nested components', () => {
    const PARENT_UID = 'putnest.parent';
    const CHILD_UID = 'putnest.child';
    // `createComponentUID` derives the uid from the category and the display name
    const FRESH_UID = 'putnest.fresh-section';

    beforeAll(async () => {
      const res = await updateSchema({
        components: [
          {
            action: 'create',
            uid: CHILD_UID,
            category: 'putnest',
            displayName: 'Child',
            icon: 'calendar',
            attributes: createAttributes({ label: { type: 'string' } }),
          },
          {
            action: 'create',
            uid: PARENT_UID,
            category: 'putnest',
            displayName: 'Parent',
            icon: 'calendar',
            attributes: createAttributes({ title: { type: 'string' } }),
          },
        ],
      });
      expect(res.statusCode).toBe(200);

      await restart();
    });

    afterAll(async () => {
      await updateSchema({
        components: [PARENT_UID, CHILD_UID, FRESH_UID].map((uid) => ({ action: 'delete', uid })),
      });
      await restart();
    });

    test('edits a nested component by uid and creates one by tmpUID', async () => {
      const res = await putComponent(PARENT_UID, {
        component: {
          category: 'putnest',
          displayName: 'Parent',
          icon: 'calendar',
          attributes: {
            title: { type: 'string' },
            child: { type: 'component', repeatable: false, component: CHILD_UID },
            fresh: { type: 'component', repeatable: true, component: 'tmp-fresh' },
          },
        },
        components: [
          {
            uid: CHILD_UID,
            category: 'putnest',
            displayName: 'Child Renamed',
            icon: 'calendar',
            attributes: { label: { type: 'string' } },
          },
          {
            tmpUID: 'tmp-fresh',
            category: 'putnest',
            displayName: 'Fresh Section',
            icon: 'calendar',
            attributes: { note: { type: 'text' } },
          },
        ],
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ data: { uid: PARENT_UID } });

      await restart();

      const parent = await getComponent(PARENT_UID);
      expect(parent.statusCode).toBe(200);
      expect(parent.body.data.schema.attributes).toMatchObject({
        title: { type: 'string' },
        child: { type: 'component', repeatable: false, component: CHILD_UID },
        // the tmpUID is replaced by the uid of the created component
        fresh: { type: 'component', repeatable: true, component: FRESH_UID },
      });

      const child = await getComponent(CHILD_UID);
      expect(child.statusCode).toBe(200);
      expect(child.body.data.schema.displayName).toBe('Child Renamed');

      const fresh = await getComponent(FRESH_UID);
      expect(fresh.statusCode).toBe(200);
      expect(fresh.body.data).toMatchObject({
        uid: FRESH_UID,
        category: 'putnest',
        schema: { displayName: 'Fresh Section', attributes: { note: { type: 'text' } } },
      });
    });
  });

  describe('PUT /components/:uid round trip of every field kind', () => {
    const ITEM_UID = 'putround.item';
    const PART_UID = 'putround.part';
    const OWNER_UID = 'api::putround-owner.putround-owner';

    beforeAll(async () => {
      const res = await updateSchema({
        components: [
          {
            action: 'create',
            uid: PART_UID,
            category: 'putround',
            displayName: 'Part',
            icon: 'calendar',
            attributes: createAttributes({ label: { type: 'string' } }),
          },
          {
            action: 'create',
            uid: ITEM_UID,
            category: 'putround',
            displayName: 'Item',
            icon: 'calendar',
            attributes: createAttributes({
              title: { type: 'string' },
              obsolete: { type: 'string' },
            }),
          },
        ],
        contentTypes: [
          {
            action: 'create',
            uid: OWNER_UID,
            displayName: 'Putround Owner',
            singularName: 'putround-owner',
            pluralName: 'putround-owners',
            kind: 'collectionType',
            draftAndPublish: false,
            attributes: createAttributes({ name: { type: 'string' } }),
          },
        ],
      });
      expect(res.statusCode).toBe(200);

      await restart();
    });

    afterAll(async () => {
      await updateSchema({
        components: [ITEM_UID, PART_UID].map((uid) => ({ action: 'delete', uid })),
        contentTypes: [{ action: 'delete', uid: OWNER_UID }],
      });
      await restart();
    });

    test('adds media, component and relation fields, sets field pluginOptions and removes a field', async () => {
      const res = await putComponent(ITEM_UID, {
        component: {
          category: 'putround',
          displayName: 'Item',
          icon: 'calendar',
          attributes: {
            // `obsolete` is left out, which removes it
            title: { type: 'string', pluginOptions: { pluginName: { option: true } } },
            cover: { type: 'media', multiple: false, allowedTypes: ['images'] },
            part: { type: 'component', repeatable: true, component: PART_UID },
            owner: { type: 'relation', relation: 'oneToOne', target: OWNER_UID },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ data: { uid: ITEM_UID } });

      await restart();

      const item = await getComponent(ITEM_UID);
      expect(item.statusCode).toBe(200);

      const { attributes } = item.body.data.schema;
      expect(attributes).toMatchObject({
        title: { type: 'string', pluginOptions: { pluginName: { option: true } } },
        cover: { type: 'media', multiple: false, allowedTypes: ['images'] },
        part: { type: 'component', repeatable: true, component: PART_UID },
        owner: { type: 'relation', relation: 'oneToOne', target: OWNER_UID },
      });
      expect(attributes).not.toHaveProperty('obsolete');
    });
  });

  describe('PUT /components/:uid when a schema file fails to write', () => {
    const CARD_UID = 'putfail.card';
    const MOVED_CATEGORY = 'putfailmoved';
    let blockedPath;

    // A directory where the moved component file must go makes its write fail with
    // EISDIR, and the builder rolls the files back. Does not depend on file modes,
    // which root (CI) ignores.
    const blockMovedFile = () => {
      blockedPath = path.join(strapi.dirs.app.components, MOVED_CATEGORY, 'card.json');
      fs.mkdirSync(blockedPath, { recursive: true });
    };

    const unblockMovedFile = () => {
      fs.rmSync(path.join(strapi.dirs.app.components, MOVED_CATEGORY), {
        recursive: true,
        force: true,
      });
    };

    beforeAll(async () => {
      const res = await updateSchema({
        components: [
          {
            action: 'create',
            uid: CARD_UID,
            category: 'putfail',
            displayName: 'Card',
            icon: 'calendar',
            attributes: createAttributes({ title: { type: 'string' } }),
          },
        ],
      });
      expect(res.statusCode).toBe(200);

      await restart();
    });

    afterAll(async () => {
      unblockMovedFile();
      await updateSchema({ components: [{ action: 'delete', uid: CARD_UID }] });
      await restart();
    });

    test('answers 400 and keeps the component where it was', async () => {
      const cardFile = readComponentFile('putfail', 'card');
      blockMovedFile();

      const res = await putComponent(CARD_UID, {
        component: {
          category: MOVED_CATEGORY,
          displayName: 'Card',
          icon: 'calendar',
          attributes: { title: { type: 'string' } },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid schema edition' });

      // The write failed before the file in the old category was removed, and the rollback
      // wrote it back as it was
      expect(readComponentFile('putfail', 'card')).toEqual(cardFile);

      unblockMovedFile();
      await restart();

      expect((await getComponent(CARD_UID)).statusCode).toBe(200);
      expect((await getComponent(`${MOVED_CATEGORY}.card`)).statusCode).toBe(404);
    });
  });

  describe('PUT /components/:uid with nested components when a schema file fails to write', () => {
    const CATEGORY = 'putnestfail';
    const MOVED_CATEGORY = 'putnestfailmoved';
    const PARENT_UID = `${CATEGORY}.parent`;
    const CHILD_UID = `${CATEGORY}.child`;
    // `createComponentUID` derives the uid from the category and the display name
    const FRESH_UID = `${CATEGORY}.fresh-section`;

    // A directory where the moved parent file must go makes its write fail with EISDIR
    const blockMovedFile = () => {
      fs.mkdirSync(componentPath(MOVED_CATEGORY, 'parent'), { recursive: true });
    };

    const unblockMovedFile = () => {
      fs.rmSync(path.join(strapi.dirs.app.components, MOVED_CATEGORY), {
        recursive: true,
        force: true,
      });
    };

    beforeAll(async () => {
      const res = await updateSchema({
        components: [
          {
            action: 'create',
            uid: CHILD_UID,
            category: CATEGORY,
            displayName: 'Child',
            icon: 'calendar',
            attributes: createAttributes({ label: { type: 'string' } }),
          },
          {
            action: 'create',
            uid: PARENT_UID,
            category: CATEGORY,
            displayName: 'Parent',
            icon: 'calendar',
            attributes: createAttributes({
              title: { type: 'string' },
              child: { type: 'component', repeatable: false, component: CHILD_UID },
            }),
          },
        ],
      });
      expect(res.statusCode).toBe(200);

      await restart();
    });

    afterAll(async () => {
      unblockMovedFile();
      fs.rmSync(componentPath(CATEGORY, 'fresh-section'), { force: true });
      await updateSchema({
        components: [PARENT_UID, CHILD_UID].map((uid) => ({ action: 'delete', uid })),
      });
      await restart();
    });

    test('answers 400, removes the created component and restores the edited ones as they were', async () => {
      const parentFile = readComponentFile(CATEGORY, 'parent');
      const childFile = readComponentFile(CATEGORY, 'child');
      blockMovedFile();

      const res = await putComponent(PARENT_UID, {
        component: {
          category: MOVED_CATEGORY,
          displayName: 'Parent',
          icon: 'calendar',
          attributes: {
            title: { type: 'string' },
            child: { type: 'component', repeatable: false, component: CHILD_UID },
            fresh: { type: 'component', repeatable: true, component: 'tmp-fresh' },
          },
        },
        components: [
          {
            uid: CHILD_UID,
            category: CATEGORY,
            displayName: 'Child Renamed',
            icon: 'calendar',
            attributes: { label: { type: 'string' } },
          },
          {
            tmpUID: 'tmp-fresh',
            category: CATEGORY,
            displayName: 'Fresh Section',
            icon: 'calendar',
            attributes: { note: { type: 'text' } },
          },
        ],
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid schema edition' });

      expect(fs.existsSync(componentPath(CATEGORY, 'fresh-section'))).toBe(false);
      expect(readComponentFile(CATEGORY, 'parent')).toEqual(parentFile);
      expect(readComponentFile(CATEGORY, 'child')).toEqual(childFile);

      unblockMovedFile();
      await restart();

      expect((await getComponent(FRESH_UID)).statusCode).toBe(404);
      expect((await getComponent(CHILD_UID)).body.data.schema.displayName).toBe('Child');
    });
  });

  describe('POST /components when the schema file fails to write', () => {
    const CATEGORY = 'postfail';
    const CARD_UID = `${CATEGORY}.card`;

    // A directory where the new component file must go makes its write fail with EISDIR
    const blockCardFile = () => {
      fs.mkdirSync(componentPath(CATEGORY, 'card'), { recursive: true });
    };

    afterAll(async () => {
      fs.rmSync(path.join(strapi.dirs.app.components, CATEGORY), { recursive: true, force: true });
      await restart();
    });

    test('answers 400 and creates no component', async () => {
      blockCardFile();

      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {
            category: CATEGORY,
            displayName: 'Card',
            icon: 'calendar',
            attributes: { title: { type: 'string' } },
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid schema edition' });

      await restart();

      expect((await getComponent(CARD_UID)).statusCode).toBe(404);
    });
  });

  describe('PUT /component-categories/:name when a schema file fails to write', () => {
    const CATEGORY = 'catfail';
    const NEW_CATEGORY = 'catfailnew';
    const NAMES = ['alpha', 'beta'];

    // A directory where one moved file must go makes its write fail with EISDIR
    const blockMovedFile = () => {
      fs.mkdirSync(componentPath(NEW_CATEGORY, 'beta'), { recursive: true });
    };

    const unblockMovedFile = () => {
      fs.rmSync(path.join(strapi.dirs.app.components, NEW_CATEGORY), {
        recursive: true,
        force: true,
      });
    };

    beforeAll(async () => {
      const res = await updateSchema({
        components: NAMES.map((name) => ({
          action: 'create',
          uid: `${CATEGORY}.${name}`,
          category: CATEGORY,
          displayName: name,
          icon: 'calendar',
          attributes: createAttributes({ title: { type: 'string' } }),
        })),
      });
      expect(res.statusCode).toBe(200);

      await restart();
    });

    afterAll(async () => {
      unblockMovedFile();
      await updateSchema({
        components: NAMES.map((name) => ({ action: 'delete', uid: `${CATEGORY}.${name}` })),
      });
      await restart();
    });

    test('answers 400 and keeps every component of the category where it was', async () => {
      const files = NAMES.map((name) => readComponentFile(CATEGORY, name));
      blockMovedFile();

      const res = await rq({
        method: 'PUT',
        url: `/content-type-builder/component-categories/${CATEGORY}`,
        body: { name: NEW_CATEGORY },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({ message: 'Invalid schema edition' });

      expect(NAMES.map((name) => readComponentFile(CATEGORY, name))).toEqual(files);
      expect(fs.existsSync(componentPath(NEW_CATEGORY, 'alpha'))).toBe(false);

      unblockMovedFile();
      await restart();

      for (const name of NAMES) {
        expect((await getComponent(`${CATEGORY}.${name}`)).statusCode).toBe(200);
        expect((await getComponent(`${NEW_CATEGORY}.${name}`)).statusCode).toBe(404);
      }
    });
  });
});
