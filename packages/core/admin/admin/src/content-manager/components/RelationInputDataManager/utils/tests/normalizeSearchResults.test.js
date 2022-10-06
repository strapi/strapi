import { normalizeSearchResults } from '../normalizeSearchResults';

const FIXTURE_RELATIONS = {
  data: {
    pages: [
      {
        results: [
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
        ],
      },
    ],
  },
};

describe('RelationInputDataManager || normalizeSearchResults', () => {
  test('add publicationState attribute to each relation', () => {
    expect(normalizeSearchResults(FIXTURE_RELATIONS, {})).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({ publicationState: 'published' }),
            expect.objectContaining({ publicationState: 'draft' }),
            expect.objectContaining({ publicationState: false }),
          ],
        ],
      },
    });
  });

  test('add mainField attribute to each relation', () => {
    expect(
      normalizeSearchResults(FIXTURE_RELATIONS, {
        mainFieldName: 'name',
      })
    ).toStrictEqual({
      data: {
        pages: [
          [
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].results[0].name,
            }),
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].results[1].name,
            }),
            expect.objectContaining({
              mainField: FIXTURE_RELATIONS.data.pages[0].results[2].name,
            }),
          ],
        ],
      },
    });
  });
});
