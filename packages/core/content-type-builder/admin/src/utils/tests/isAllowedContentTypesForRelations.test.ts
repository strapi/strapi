import { isAllowedContentTypesForRelations } from '../isAllowedContentTypesForRelations';

import type { ContentType } from '../../types';

describe('CTB | utils | isAllowedContentTypesForRelations', () => {
  it('should be falsy if the model is a single type', () => {
    expect(
      isAllowedContentTypesForRelations({
        kind: 'singleType',
        restrictRelationsTo: null,
      })
    ).toBeFalsy();
  });

  it('should be falsy if the restricted relations is an empty array', () => {
    expect(
      isAllowedContentTypesForRelations({
        kind: 'collectionType',
        restrictRelationsTo: [],
      })
    ).toBeFalsy();
  });

  it('should be truthy if the model is a collection type and the restricted relations is null', () => {
    expect(
      isAllowedContentTypesForRelations({
        kind: 'collectionType',
        restrictRelationsTo: null,
      })
    ).toBeTruthy();
  });

  it('should be truthy if the model is a collection type and the restricted relations is not empty array', () => {
    expect(
      isAllowedContentTypesForRelations({
        kind: 'collectionType',
        restrictRelationsTo: ['oneWay', 'manyWay'],
      })
    ).toBeTruthy();
  });

  it('should be falsy if restrictRelationsTo is undefined', () => {
    expect(
      isAllowedContentTypesForRelations({
        kind: 'collectionType',
      })
    ).toBeFalsy();
  });

  it('should be falsy if kind is undefined', () => {
    expect(
      isAllowedContentTypesForRelations({
        restrictRelationsTo: ['oneWay', 'manyWay'],
      })
    ).toBeFalsy();
  });
});
