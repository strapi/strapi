import { normalizeSearchResults } from '../normalizeSearchResults';

const FIXTURE_RELATIONS = [
  {
    id: 3,
    name: 'Relation 3',
    publishedAt: '2022-08-24T09:29:11.38',
  },

  {
    id: 2,
    name: 'Relation 2',
    publishedAt: null,
  },

  {
    id: 1,
    name: 'Relation 1',
    publishedAt: null,
  },
];

describe('RelationInputDataManager || normalizeSearchResults', () => {
  test('add publicationState attribute to each relation', () => {
    // @ts-expect-error – mainField is required.
    expect(normalizeSearchResults(FIXTURE_RELATIONS, {})).toMatchInlineSnapshot(`
      [
        {
          "id": 3,
          "mainField": undefined,
          "name": "Relation 3",
          "publicationState": "published",
          "publishedAt": "2022-08-24T09:29:11.38",
        },
        {
          "id": 2,
          "mainField": undefined,
          "name": "Relation 2",
          "publicationState": "draft",
          "publishedAt": null,
        },
        {
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
      normalizeSearchResults(FIXTURE_RELATIONS, {
        mainFieldName: 'name',
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "id": 3,
          "mainField": "Relation 3",
          "name": "Relation 3",
          "publicationState": "published",
          "publishedAt": "2022-08-24T09:29:11.38",
        },
        {
          "id": 2,
          "mainField": "Relation 2",
          "name": "Relation 2",
          "publicationState": "draft",
          "publishedAt": null,
        },
        {
          "id": 1,
          "mainField": "Relation 1",
          "name": "Relation 1",
          "publicationState": "draft",
          "publishedAt": null,
        },
      ]
    `);
  });
});
