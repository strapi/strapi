import { describe, expect, it } from 'vitest';

import { relationRefs } from '../relation-refs';

describe('relationRefs', () => {
  it.each([
    ['a documentId', 'abc', [{ documentId: 'abc' }]],
    ['a numeric id', 4, [{ id: 4 }]],
    ['longhand with a documentId', { documentId: 'abc', locale: 'en' }, [{ documentId: 'abc' }]],
    ['longhand with an id', { id: 4 }, [{ id: 4 }]],
    [
      'a list of mixed values',
      ['abc', 4, { documentId: 'def' }],
      [{ documentId: 'abc' }, { id: 4 }, { documentId: 'def' }],
    ],
    [
      'a connect list',
      { connect: ['abc', { documentId: 'def' }] },
      [{ documentId: 'abc' }, { documentId: 'def' }],
    ],
    ['a connect of one value', { connect: 'abc' }, [{ documentId: 'abc' }]],
    ['a connect of one longhand object', { connect: { id: 4 } }, [{ id: 4 }]],
    ['a set list', { set: ['abc'] }, [{ documentId: 'abc' }]],
  ])('reads %s', (_name, value, expected) => {
    expect(relationRefs(value)).toEqual(expected);
  });

  it('lets a set decide alone, as the Document Service does', () => {
    expect(relationRefs({ connect: ['a'], set: ['b'] })).toEqual([{ documentId: 'b' }]);
    expect(relationRefs({ connect: ['a'], set: [] })).toEqual([]);
  });

  it('ignores a set that is null or undefined', () => {
    expect(relationRefs({ connect: ['a'], set: null })).toEqual([{ documentId: 'a' }]);
    expect(relationRefs({ connect: ['a'], set: undefined })).toEqual([{ documentId: 'a' }]);
  });

  it('reads a disconnect as no one a write adds', () => {
    expect(relationRefs({ disconnect: ['a'] })).toEqual([]);
    expect(relationRefs({ connect: [], disconnect: ['a'] })).toEqual([]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['an empty list', []],
    ['an empty object', {}],
    ['a boolean', true],
    ['an object with an empty documentId', { documentId: '' }],
  ])('reads %s as no one', (_name, value) => {
    expect(relationRefs(value)).toEqual([]);
  });
});
