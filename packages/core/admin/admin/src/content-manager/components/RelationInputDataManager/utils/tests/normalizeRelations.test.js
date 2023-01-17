import { normalizeRelations } from '../normalizeRelations';

const FIXTURE_RELATIONS = [
  {
    id: 3,
    name: 'Relation 3',
    publishedAt: '2022-08-24T09:29:11.38',
  },

  {
    id: 2,
    name: 'Relation 2',
    publishedAt: '',
  },
  {
    id: 1,
    name: 'Relation 1',
  },
];

describe('RelationInputDataManager || normalizeRelations', () => {
  test('add link to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        shouldAddLink: true,
        targetModel: 'something',
      })
    ).toStrictEqual([
      expect.objectContaining({ href: '/content-manager/collectionType/something/3' }),
      expect.objectContaining({ href: '/content-manager/collectionType/something/2' }),
      expect.objectContaining({ href: '/content-manager/collectionType/something/1' }),
    ]);
  });

  test('add publicationState attribute to each relation', () => {
    expect(normalizeRelations(FIXTURE_RELATIONS)).toStrictEqual([
      expect.objectContaining({ publicationState: 'published' }),
      expect.objectContaining({ publicationState: 'draft' }),
      expect.objectContaining({ publicationState: false }),
    ]);
  });

  test('add mainField attribute to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        mainFieldName: 'name',
      })
    ).toStrictEqual([
      expect.objectContaining({
        mainField: FIXTURE_RELATIONS[0].name,
      }),
      expect.objectContaining({
        mainField: FIXTURE_RELATIONS[1].name,
      }),
      expect.objectContaining({
        mainField: FIXTURE_RELATIONS[2].name,
      }),
    ]);
  });
});
