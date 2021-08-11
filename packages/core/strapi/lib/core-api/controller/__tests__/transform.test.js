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
});
