import { hasSort } from '../sort-query';

describe('hasSort', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty array', []],
    ['empty string', ''],
    ['comma-only string', ','],
    ['empty object', {}],
    ['array of empty strings', ['']],
    ['array of empty sort objects', [{}]],
    ['qs sort[] (null entry)', [null]],
    ['object sort with empty order', { title: '' }],
  ])('returns false for %s', (_label, sort) => {
    expect(hasSort(sort)).toBe(false);
  });

  it.each([
    ['string sort', 'title:asc'],
    ['array with field', ['title:asc']],
    ['object sort', { title: 'asc' }],
  ])('returns true for %s', (_label, sort) => {
    expect(hasSort(sort)).toBe(true);
  });
});
