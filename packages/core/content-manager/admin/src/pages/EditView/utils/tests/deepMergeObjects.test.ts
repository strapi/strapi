import { deepMerge } from '../deepMergeObjects';

describe('deepMerge', () => {
  test('should merge simple objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const expected = { a: 1, b: 3, c: 4 };
    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle null or undefined source', () => {
    const target = { a: 1, b: 2 };
    expect(deepMerge(target, null as any)).toEqual(target);
    expect(deepMerge(target, undefined as any)).toEqual(target);
  });

  test('should merge nested objects', () => {
    const target = { a: 1, b: { c: 2, d: 3 } };
    const source = { b: { d: 4, e: 5 } };
    const expected = { a: 1, b: { c: 2, d: 4, e: 5 } };
    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should merge objects within arrays', () => {
    const target = { a: [{ b: 1 }, { c: 2 }] };
    const source = { a: [{ b: 3 }, { d: 4 }] };
    const expected = { a: [{ b: 3 }, { c: 2, d: 4 }] };
    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle different types (source value overrides)', () => {
    const target = { a: { b: 1 } };
    const source = { a: 'string value' };
    const expected = { a: 'string value' };
    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle the specific example provided', () => {
    const target = {
      short_text: 'kitchen',
      repeatable_compo: [],
      dynamiczone: [],
      one_way_tag: {
        connect: [],
        disconnect: [],
      },
      one_to_one_tag: {
        connect: [],
        disconnect: [],
      },
      one_to_many_tags: {
        connect: [],
        disconnect: [],
      },
      many_to_one_tag: {
        connect: [],
        disconnect: [],
      },
      many_to_many_tags: {
        connect: [],
        disconnect: [],
      },
      many_way_tags: {
        connect: [],
        disconnect: [],
      },
      cats: [
        {
          __component: 'basic.relation',
          id: 5,
          categories: {
            connect: [],
            disconnect: [],
          },
          __temp_key__: 'a0',
        },
        {
          __component: 'basic.relation',
          id: 6,
          categories: {
            connect: [],
            disconnect: [],
          },
          __temp_key__: 'a1',
        },
      ],
    };

    const source = {
      cats: [
        {},
        {
          categories: {
            connect: [
              {
                id: 'cp0mqidthtsjmc5tqxfoqmj4',
                documentId: 'cp0mqidthtsjmc5tqxfoqmj4',
                locale: 'en',
              },
            ],
          },
        },
      ],
    };

    const expected = {
      short_text: 'kitchen',
      repeatable_compo: [],
      dynamiczone: [],
      one_way_tag: {
        connect: [],
        disconnect: [],
      },
      one_to_one_tag: {
        connect: [],
        disconnect: [],
      },
      one_to_many_tags: {
        connect: [],
        disconnect: [],
      },
      many_to_one_tag: {
        connect: [],
        disconnect: [],
      },
      many_to_many_tags: {
        connect: [],
        disconnect: [],
      },
      many_way_tags: {
        connect: [],
        disconnect: [],
      },
      cats: [
        {
          __component: 'basic.relation',
          id: 5,
          categories: {
            connect: [],
            disconnect: [],
          },
          __temp_key__: 'a0',
        },
        {
          __component: 'basic.relation',
          id: 6,
          categories: {
            connect: [
              {
                id: 'cp0mqidthtsjmc5tqxfoqmj4',
                documentId: 'cp0mqidthtsjmc5tqxfoqmj4',
                locale: 'en',
              },
            ],
            disconnect: [],
          },
          __temp_key__: 'a1',
        },
      ],
    };

    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle arrays without __temp_key__', () => {
    const target = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
    };

    const source = {
      items: [{ id: 3 }, { desc: 'Description' }],
    };

    const expected = {
      items: [
        { id: 3, name: 'Item 1' },
        { id: 2, name: 'Item 2', desc: 'Description' },
      ],
    };

    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle empty arrays', () => {
    const target = { items: [] };
    const source = { items: [{ id: 1 }] };
    const expected = { items: [{ id: 1 }] };
    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle non-object values in source', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { a: 2, b: null };
    const expected = { a: 2, b: null };
    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle mixed array and object structures', () => {
    const target = {
      a: { b: [{ c: 1 }, { d: 2 }] },
    };

    const source = {
      a: { b: [{ e: 3 }] },
    };

    const expected = {
      a: { b: [{ c: 1, e: 3 }, { d: 2 }] },
    };

    expect(deepMerge(target, source)).toEqual(expected);
  });

  test('should handle __temp_key__ matching when keys are partially present', () => {
    const target = {
      items: [{ id: 1, __temp_key__: 'a' }, { id: 2 }],
    };

    const source = {
      items: [
        { name: 'Item 1', __temp_key__: 'a' },
        { name: 'Item 2', __temp_key__: 'b' },
      ],
    };

    const expected = {
      items: [
        { id: 1, name: 'Item 1', __temp_key__: 'a' },
        { id: 2, name: 'Item 2', __temp_key__: 'b' },
      ],
    };

    expect(deepMerge(target, source)).toEqual(expected);
  });
});
