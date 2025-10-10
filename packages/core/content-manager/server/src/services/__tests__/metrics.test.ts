import metricsServiceLoader from '../metrics';

let metricsService;

describe('metrics', () => {
  describe('sendDidConfigureListView', () => {
    const contentType = {
      attributes: {
        field1: {
          type: 'relation',
          relation: 'oneToMany',
        },
        field2: {
          type: 'relation',
          relation: 'manyToMany',
        },
        field3: {
          type: 'relation',
          relation: 'manyWay',
        },
        field4: {
          type: 'relation',
          relation: 'manyToOne',
        },
        field5: {
          type: 'relation',
          relation: 'oneWay',
        },
        field6: {
          type: 'relation',
          relation: 'oneToOne',
        },
      },
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
      global.strapi = { telemetry: { send } } as any;
      metricsService = metricsServiceLoader({ strapi });
      const [containsRelationalFields, displayedFields, displayedRelationalFields] = expectedResult;
      await metricsService.sendDidConfigureListView(
        contentType as any,
        { layouts: { list } } as any
      );

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('didConfigureListView', {
        eventProperties: {
          containsRelationalFields,
          displayedFields,
          displayedRelationalFields,
        },
      });
    });
  });
});
