import { filterRemovedRelations } from '../filterRemovedRelations';

const FIXTURE_RELATIONS = {
  data: {
    pages: [[{ id: 1 }, { id: 2 }]],
  },
};

describe('filterRemovedRelations', () => {
  test('does not filter anything, if no removals are stored', () => {
    expect(filterRemovedRelations(FIXTURE_RELATIONS, {})).toStrictEqual(FIXTURE_RELATIONS);
  });

  test('does filter relations, marked for removal', () => {
    expect(
      filterRemovedRelations(FIXTURE_RELATIONS, {
        remove: [
          {
            id: 1,
          },
        ],
      })
    ).toStrictEqual({
      data: {
        pages: [[{ id: 2 }]],
      },
    });
  });

  test('does filter all relations, marked for removal and cleans up pages array', () => {
    expect(
      filterRemovedRelations(FIXTURE_RELATIONS, {
        remove: [
          {
            id: 1,
          },

          {
            id: 2,
          },
        ],
      })
    ).toStrictEqual({
      data: {
        pages: [],
      },
    });
  });
});
