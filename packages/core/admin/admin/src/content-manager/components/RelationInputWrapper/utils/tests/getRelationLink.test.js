import { getRelationLink } from '../getRelationLink';

describe('getRelationLink', () => {
  test('returns an URL containing the targetModel and id', () => {
    expect(getRelationLink('model', 2)).toBe('/admin/content-manager/collectionType/model/2');
  });

  test('returns an URL containing the targetModel', () => {
    expect(getRelationLink('model', undefined)).toBe(
      '/admin/content-manager/collectionType/model/'
    );
  });
});
