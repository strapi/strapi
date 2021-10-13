'use strict';

const metricsService = require('../metrics');

describe('metrics', () => {
  describe('sendDidConfigureListView', () => {
    const contentType = {
      associations: [
        {
          alias: 'field1',
          nature: 'oneToMany',
        },
        {
          alias: 'field2',
          nature: 'manyToMany',
        },
        {
          alias: 'field3',
          nature: 'manyWay',
        },
        {
          alias: 'field4',
          nature: 'manyToOne',
        },
        {
          alias: 'field5',
          nature: 'oneWay',
        },
        {
          alias: 'field6',
          nature: 'oneToOne',
        },
      ],
    };

    const testData = [
      [['fieldA'], [false]],
      [['fieldA', 'fieldB'], [false]],
      [
        ['fieldA', 'field1'],
        [true, 2, 1],
      ],
      [
        ['field1', 'field2'],
        [true, 2, 2],
      ],
      [['field1'], [true, 1, 1]],
      [
        ['fieldA', 'fieldB', 'field1', 'field2'],
        [true, 4, 2],
      ],
      [
        ['fieldA', 'fieldB', 'field3', 'field4'],
        [true, 4, 2],
      ],
      [
        ['fieldA', 'fieldB', 'field5', 'field6'],
        [true, 4, 2],
      ],
    ];

    test.each(testData)('%s', async (list, expectedResult) => {
      const send = jest.fn(() => Promise.resolve());
      global.strapi = { telemetry: { send } };
      const [containsRelationalFields, displayedFields, displayedRelationalFields] = expectedResult;

      await metricsService.sendDidConfigureListView(contentType, { layouts: { list } });

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('didConfigureListView', {
        displayedFields,
        containsRelationalFields,
        displayedRelationalFields,
      });
    });
  });
});
