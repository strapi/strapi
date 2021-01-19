'use strict';

const { getRelationalFields } = require('../relations');

describe('Relations', () => {
  describe('getRelationalFields', () => {
    const testData = [
      ['empty', [], []],
      ['oneToMany', [{ nature: 'oneToMany', alias: 'name' }], ['name']],
      ['manyToMany', [{ nature: 'manyToMany', alias: 'name' }], ['name']],
      ['manyWay', [{ nature: 'manyWay', alias: 'name' }], ['name']],
      ['manyToOne', [{ nature: 'manyToOne', alias: 'name' }], ['name']],
      ['oneWay', [{ nature: 'oneWay', alias: 'name' }], ['name']],
      ['oneToOne', [{ nature: 'oneToOne', alias: 'name' }], ['name']],
      [
        'oneToMany & manyMorphToOne',
        [
          { nature: 'oneToMany', alias: 'name' },
          { nature: 'manyMorphToOne', alias: 'name' },
        ],
        ['name'],
      ],
      [
        'manyToMany & manyMorphToOne',
        [
          { nature: 'manyToMany', alias: 'name' },
          { nature: 'manyMorphToOne', alias: 'name' },
        ],
        ['name'],
      ],
      [
        'manyWay & manyMorphToOne',
        [
          { nature: 'manyWay', alias: 'name' },
          { nature: 'manyMorphToOne', alias: 'name' },
        ],
        ['name'],
      ],
      [
        'manyToOne & manyMorphToOne',
        [
          { nature: 'manyToOne', alias: 'name' },
          { nature: 'manyMorphToOne', alias: 'name' },
        ],
        ['name'],
      ],
      [
        'oneWay & manyMorphToOne',
        [
          { nature: 'oneWay', alias: 'name' },
          { nature: 'manyMorphToOne', alias: 'name' },
        ],
        ['name'],
      ],
      [
        'oneToOne & manyMorphToOne',
        [
          { nature: 'oneToOne', alias: 'name' },
          { nature: 'manyMorphToOne', alias: 'name' },
        ],
        ['name'],
      ],
      [
        'all possible associations',
        [
          { nature: 'oneToMany', alias: 'name1' },
          { nature: 'manyToMany', alias: 'name2' },
          { nature: 'manyWay', alias: 'name3' },
          { nature: 'manyToOne', alias: 'name4' },
          { nature: 'oneWay', alias: 'name5' },
          { nature: 'oneToOne', alias: 'name6' },
          { nature: 'manyToManyMorph', alias: 'name7' },
          { nature: 'manyToOneMorph', alias: 'name8' },
          { nature: 'oneToManyMorph', alias: 'name9' },
          { nature: 'oneToOneMorph', alias: 'name10' },
          { nature: 'oneMorphToMany', alias: 'name11' },
          { nature: 'oneMorphToOne', alias: 'name12' },
          { nature: 'manyMorphToOne', alias: 'name13' },
          { nature: 'manyMorphToMany', alias: 'name14' },
        ],
        ['name1', 'name2', 'name3', 'name4', 'name5', 'name6'],
      ],
    ];

    test.each(testData)('%s', (name, associations, expectedResult) => {
      expect(getRelationalFields({ associations })).toEqual(expectedResult);
    });
  });
});
