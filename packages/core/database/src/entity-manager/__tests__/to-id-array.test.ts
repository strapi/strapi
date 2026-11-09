import { isEqual, uniqWith } from 'lodash';

import { toIdArray } from '../index';

describe('toIdArray', () => {
  test('wraps scalar ids and keeps the order of first appearance', () => {
    expect(toIdArray([3, 1, 2])).toEqual([
      { id: 3, __pivot: {} },
      { id: 1, __pivot: {} },
      { id: 2, __pivot: {} },
    ]);
  });

  test('accepts a single id or object and skips nullish entries', () => {
    expect(toIdArray(4)).toEqual([{ id: 4, __pivot: {} }]);
    expect(toIdArray({ id: 'a' })).toEqual([{ id: 'a' }]);
    expect(toIdArray([1, null, undefined, 2])).toEqual([
      { id: 1, __pivot: {} },
      { id: 2, __pivot: {} },
    ]);
    expect(toIdArray(undefined)).toEqual([]);
  });

  test('removes entries equal to an earlier one', () => {
    expect(toIdArray([1, 2, 1, { id: 2, __pivot: {} }, 3, 3])).toEqual([
      { id: 1, __pivot: {} },
      { id: 2, __pivot: {} },
      { id: 3, __pivot: {} },
    ]);
  });

  test('keeps entries that share an id but differ in other keys', () => {
    const result = toIdArray([
      { id: 1, __pivot: { score: 1 } },
      { id: 1, __pivot: { score: 2 } },
      { id: 1, __pivot: { score: 1 } },
      { id: 1, __pivot: { score: 2 } },
      { id: 1, position: { end: true } },
    ]);

    expect(result).toEqual([
      { id: 1, __pivot: { score: 1 } },
      { id: 1, __pivot: { score: 2 } },
      { id: 1, position: { end: true } },
    ]);
  });

  test('does not treat a string id and a number id as the same entry', () => {
    expect(toIdArray([5, '5', 5, '5'])).toEqual([
      { id: 5, __pivot: {} },
      { id: '5', __pivot: {} },
    ]);
  });

  test('throws on an invalid id', () => {
    expect(() => toIdArray([{ id: 1.5 }])).toThrow('Invalid id, expected a string or integer');
    expect(() => toIdArray([{ name: 'x' }])).toThrow('Invalid id, expected a string or integer');
  });

  test('returns the same entries as uniqWith(isEqual) on a large mixed input', () => {
    const input: unknown[] = Array.from({ length: 3000 }, (_, i) => i);

    for (let i = 0; i < 3000; i += 7) input.push(i);
    for (let i = 0; i < 3000; i += 11) input.push({ id: i, __pivot: { position: i } });
    for (let i = 0; i < 3000; i += 13) input.push({ id: String(i) });

    const expected = uniqWith(
      input.map((datum) => (typeof datum === 'object' ? datum : { id: datum, __pivot: {} })),
      isEqual
    );

    expect(toIdArray(input)).toEqual(expected);
  });

  test('handles thousands of entries in linear time', () => {
    const input = Array.from({ length: 10000 }, (_, i) => ({ id: i, __pivot: {} }));
    const start = Date.now();

    expect(toIdArray(input)).toHaveLength(10000);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
