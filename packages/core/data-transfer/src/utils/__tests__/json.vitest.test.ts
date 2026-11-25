import { describe, it, expect } from 'vitest';

import { diff } from '../json';

describe('json diff', () => {
  it('returns empty diff for equal primitives', () => {
    expect(diff('hello', 'hello')).toEqual([]);
    expect(diff(1, 1)).toEqual([]);
    expect(diff(null, null)).toEqual([]);
  });

  it('detects modified primitives', () => {
    expect(diff('a', 'b')).toEqual([
      {
        kind: 'modified',
        path: [],
        types: ['string', 'string'],
        values: ['a', 'b'],
      },
    ]);
  });

  it('detects added and deleted object keys', () => {
    expect(diff({ a: 1 }, { a: 1, b: 2 })).toEqual([
      { kind: 'added', path: ['b'], type: 'number', value: 2 },
    ]);

    expect(diff({ a: 1, b: 2 }, { a: 1 })).toEqual([
      { kind: 'deleted', path: ['b'], type: 'number', value: 2 },
    ]);
  });

  it('detects nested object changes', () => {
    expect(diff({ nested: { count: 1 } }, { nested: { count: 2 } })).toEqual([
      {
        kind: 'modified',
        path: ['nested', 'count'],
        types: ['number', 'number'],
        values: [1, 2],
      },
    ]);
  });

  it('compares arrays by index', () => {
    expect(diff([1, 2], [1, 3])).toEqual([
      {
        kind: 'modified',
        path: ['1'],
        types: ['number', 'number'],
        values: [2, 3],
      },
    ]);
  });
});
