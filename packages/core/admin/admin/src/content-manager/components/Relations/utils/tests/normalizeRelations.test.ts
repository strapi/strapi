// @ts-nocheck TODO remove after FE relations changes
import { normalizeRelations } from '../normalizeRelations';

const FIXTURE_RELATIONS = [
  {
    id: 3,
    documentId: 'Doc3',
    name: 'Relation 3',
    publishedAt: '2022-08-24T09:29:11.38',
  },
  {
    id: 2,
    documentId: 'Doc2',
    name: 'Relation 2',
    publishedAt: '',
  },
  {
    id: 1,
    documentId: 'Doc1',
    name: 'Relation 1',
    publishedAt: null,
  },
];

describe('RelationInputDataManager || normalizeRelations', () => {
  test('add link to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        shouldAddLink: true,
        targetModel: 'something',
        mainFieldName: '',
      })
    ).toStrictEqual([
      expect.objectContaining({ href: '/content-manager/collection-types/something/Doc3' }),
      expect.objectContaining({ href: '/content-manager/collection-types/something/Doc2' }),
      expect.objectContaining({ href: '/content-manager/collection-types/something/Doc1' }),
    ]);
  });

  test('add publicationState attribute to each relation', () => {
    expect(
      normalizeRelations(FIXTURE_RELATIONS, {
        shouldAddLink: false,
        targetModel: '',
        mainFieldName: '',
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "documentId": "Doc3",
          "id": 3,
          "mainField": undefined,
          "name": "Relation 3",
          "publicationState": "published",
          "publishedAt": "2022-08-24T09:29:11.38",
        },
        {
          "documentId": "Doc2",
          "id": 2,
          "mainField": undefined,
          "name": "Relation 2",
          "publicationState": "draft",
          "publishedAt": "",
        },
        {
          "documentId": "Doc1",
          "id": 1,
          "mainField": undefined,
          "name": "Relation 1",
          "publicationState": "draft",
          "publishedAt": null,
        },
      ]
    `);
  });

  test('add mainField attribute to each relation', () => {
    expect(
      // @ts-expect-error – wants args
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
