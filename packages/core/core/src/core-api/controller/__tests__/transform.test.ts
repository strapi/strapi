import type { Schema } from '@strapi/types';
import * as transforms from '../transform';

describe('Transforms', () => {
  test('v4 - using json api format', () => {
    const contentType: Schema.ContentType = {
      globalId: 'test',
      kind: 'collectionType',
      modelName: 'test',
      modelType: 'contentType',
      uid: 'api::test.test',
      info: {
        displayName: 'test',
        pluralName: 'tests',
        singularName: 'test',
      },
      attributes: {
        title: {
          type: 'string',
        },
        relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::relation.relation',
        },
        media: {
          type: 'media',
        },
        multiMedia: {
          type: 'media',
          multiple: true,
        },
        repeatableCompo: {
          type: 'component',
          repeatable: true,
          component: 'default.test',
        },
        compo: {
          type: 'component',
          component: 'default.test',
        },
        dz: {
          type: 'dynamiczone',
          components: ['default.test'],
        },
      },
    };

    global.strapi = {
      contentType() {
        return undefined;
      },
      components: {
        'default.test': {
          attributes: {
            name: {
              type: 'string',
            },
          },
        },
      },
    } as any;

    expect(
      transforms.transformResponse(
        {
          id: 1,
          documentId: 'abcd',
          title: 'Hello',
          relation: { id: 1, documentId: 'abcd', value: 'test' },
          media: { id: 1, documentId: 'abcd', value: 'test' },
          multiMedia: [{ id: 1, documentId: 'abcd', value: 'test' }],
          repeatableCompo: [{ id: 1, name: 'test' }],
          compo: { id: 1, name: 'test' },
          dz: [{ id: 2, name: 'test', __component: 'default.test' }],
        },
        undefined,
        { contentType, useJsonAPIFormat: true }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        documentId: 'abcd',
        attributes: {
          title: 'Hello',
          relation: {
            data: {
              id: 1,
              documentId: 'abcd',
              attributes: { value: 'test' },
            },
          },
          media: {
            data: {
              id: 1,
              documentId: 'abcd',
              attributes: {
                value: 'test',
              },
            },
          },
          multiMedia: {
            data: [
              {
                id: 1,
                documentId: 'abcd',
                attributes: {
                  value: 'test',
                },
              },
            ],
          },
          repeatableCompo: [
            {
              id: 1,
              name: 'test',
            },
          ],
          compo: {
            id: 1,
            name: 'test',
          },
          dz: [
            {
              __component: 'default.test',
              id: 2,
              name: 'test',
            },
          ],
        },
      },
      meta: {},
    });
  });

  test('Leaves nil values untouched', () => {
    expect(transforms.transformResponse()).toBeUndefined();
    expect(transforms.transformResponse(null)).toBe(null);
  });

  test('Throws if entry is not and object or an array of object', () => {
    expect(() => transforms.transformResponse(0)).toThrow();
    expect(() => transforms.transformResponse(new Date())).toThrow();
    expect(() => transforms.transformResponse('azaz')).toThrow();
  });

  test('Handles arrays of entries', () => {
    expect(transforms.transformResponse([{ id: 1, title: 'Hello' }])).toStrictEqual({
      data: [{ id: 1, title: 'Hello' }],
      meta: {},
    });
  });

  test('Handles single entry', () => {
    expect(transforms.transformResponse({ id: 1, title: 'Hello' })).toStrictEqual({
      data: { id: 1, title: 'Hello' },
      meta: {},
    });
  });

  test('Accepts any meta', () => {
    const someMeta = { foo: 'bar' };
    expect(transforms.transformResponse({ id: 1, title: 'Hello' }, someMeta)).toStrictEqual({
      data: { id: 1, title: 'Hello' },
      meta: someMeta,
    });
  });

  test('Handles relations single value', () => {
    const contentType: Schema.ContentType = {
      globalId: 'test',
      kind: 'collectionType',
      modelName: 'test',
      modelType: 'contentType',
      uid: 'api::test.test',
      info: {
        displayName: 'test',
        pluralName: 'tests',
        singularName: 'test',
      },
      attributes: {
        relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::relation.relation',
        },
      },
    };

    global.strapi = {
      contentType() {
        return undefined;
      },
    } as any;

    expect(
      transforms.transformResponse(
        { id: 1, title: 'Hello', relation: { id: 1, value: 'test' } },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        title: 'Hello',
        relation: {
          id: 1,
          value: 'test',
        },
      },
      meta: {},
    });
  });

  test('Handles relations array value', () => {
    const contentType: Schema.ContentType = {
      globalId: 'test',
      kind: 'collectionType',
      modelName: 'test',
      modelType: 'contentType',
      uid: 'api::test.test',
      info: {
        displayName: 'test',
        pluralName: 'tests',
        singularName: 'test',
      },
      attributes: {
        relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::relation.relation',
        },
      },
    };

    global.strapi = {
      contentType() {
        return undefined;
      },
    } as any;

    expect(
      transforms.transformResponse(
        { id: 1, title: 'Hello', relation: [{ id: 1, value: 'test' }] },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        title: 'Hello',
        relation: [
          {
            id: 1,
            value: 'test',
          },
        ],
      },
      meta: {},
    });
  });

  test('Handles relations recursively', () => {
    const contentType: Schema.ContentType = {
      globalId: 'test',
      kind: 'collectionType',
      modelName: 'test',
      modelType: 'contentType',
      uid: 'api::test.test',
      info: {
        displayName: 'test',
        pluralName: 'tests',
        singularName: 'test',
      },
      attributes: {
        relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::relation.relation',
        },
      },
    };

    global.strapi = {
      contentType() {
        return {
          attributes: {
            nestedRelation: {
              type: 'relation',
              target: 'xxxx',
            },
          },
        };
      },
    } as any;

    expect(
      transforms.transformResponse(
        {
          id: 1,
          title: 'Hello',
          relation: [{ id: 1, value: 'test', nestedRelation: { id: 2, foo: 'bar' } }],
        },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        title: 'Hello',
        relation: [
          {
            id: 1,
            value: 'test',
            nestedRelation: {
              id: 2,
              foo: 'bar',
            },
          },
        ],
      },
      meta: {},
    });
  });

  test('Handles media like relations', () => {
    const contentType: Schema.ContentType = {
      globalId: 'test',
      kind: 'collectionType',
      modelName: 'test',
      modelType: 'contentType',
      uid: 'api::test.test',
      info: {
        displayName: 'test',
        pluralName: 'tests',
        singularName: 'test',
      },
      attributes: {
        media: {
          type: 'media',
        },
      },
    };

    global.strapi = {
      contentType() {
        return undefined;
      },
    } as any;

    expect(
      transforms.transformResponse(
        { id: 1, title: 'Hello', media: [{ id: 1, value: 'test' }] },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        title: 'Hello',
        media: [
          {
            id: 1,
            value: 'test',
          },
        ],
      },
      meta: {},
    });
  });

  test('Handles components & dynamic zones', () => {
    const contentType: Schema.ContentType = {
      globalId: 'test',
      kind: 'collectionType',
      modelName: 'test',
      modelType: 'contentType',
      uid: 'api::test.test',
      info: {
        displayName: 'test',
        pluralName: 'tests',
        singularName: 'test',
      },
      attributes: {
        compo: {
          type: 'component',
          component: 'default.test',
        },
        dz: {
          type: 'dynamiczone',
          components: ['default.test'],
        },
      },
    };

    global.strapi = {
      contentType() {
        return undefined;
      },
      components: {
        'default.test': {
          attributes: {
            name: {
              type: 'string',
            },
          },
        },
      },
    } as any;

    expect(
      transforms.transformResponse(
        {
          id: 1,
          title: 'Hello',
          compo: { id: 1, name: 'test' },
          dz: [{ id: 2, name: 'test', __component: 'default.test' }],
        },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        title: 'Hello',
        compo: {
          id: 1,
          name: 'test',
        },
        dz: [
          {
            __component: 'default.test',
            id: 2,
            name: 'test',
          },
        ],
      },
      meta: {},
    });
  });
});
