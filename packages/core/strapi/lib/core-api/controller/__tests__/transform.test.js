'use strict';

const transforms = require('../transform');

describe('Transforms', () => {
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
      data: [{ id: 1, attributes: { title: 'Hello' } }],
      meta: {},
    });
  });

  test('Handles single entry', () => {
    expect(transforms.transformResponse({ id: 1, title: 'Hello' })).toStrictEqual({
      data: { id: 1, attributes: { title: 'Hello' } },
      meta: {},
    });
  });

  test('Accepts any meta', () => {
    const someMeta = { foo: 'bar' };
    expect(transforms.transformResponse({ id: 1, title: 'Hello' }, someMeta)).toStrictEqual({
      data: { id: 1, attributes: { title: 'Hello' } },
      meta: someMeta,
    });
  });

  test('Handles relations single value', () => {
    const contentType = {
      attributes: {
        relation: {
          type: 'relation',
          target: 'xxx',
        },
      },
    };

    global.strapi = {
      contentType() {
        return undefined;
      },
    };

    expect(
      transforms.transformResponse(
        { id: 1, title: 'Hello', relation: { id: 1, value: 'test' } },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        attributes: {
          title: 'Hello',
          relation: {
            data: {
              id: 1,
              attributes: {
                value: 'test',
              },
            },
          },
        },
      },
      meta: {},
    });
  });

  test('Handles relations array value', () => {
    const contentType = {
      attributes: {
        relation: {
          type: 'relation',
          target: 'xxx',
        },
      },
    };

    global.strapi = {
      contentType() {
        return undefined;
      },
    };

    expect(
      transforms.transformResponse(
        { id: 1, title: 'Hello', relation: [{ id: 1, value: 'test' }] },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        attributes: {
          title: 'Hello',
          relation: {
            data: [
              {
                id: 1,
                attributes: {
                  value: 'test',
                },
              },
            ],
          },
        },
      },
      meta: {},
    });
  });

  test('Handles relations recursively', () => {
    const contentType = {
      attributes: {
        relation: {
          type: 'relation',
          target: 'xxx',
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
    };

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
        attributes: {
          title: 'Hello',
          relation: {
            data: [
              {
                id: 1,
                attributes: {
                  value: 'test',
                  nestedRelation: {
                    data: {
                      id: 2,
                      attributes: {
                        foo: 'bar',
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      meta: {},
    });
  });

  test('Handles media like relations', () => {
    const contentType = {
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
    };

    expect(
      transforms.transformResponse(
        { id: 1, title: 'Hello', media: [{ id: 1, value: 'test' }] },
        undefined,
        { contentType }
      )
    ).toStrictEqual({
      data: {
        id: 1,
        attributes: {
          title: 'Hello',
          media: {
            data: [
              {
                id: 1,
                attributes: {
                  value: 'test',
                },
              },
            ],
          },
        },
      },
      meta: {},
    });
  });
});
