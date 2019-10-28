import {
  getDefaultComponentValues,
  retrieveDisplayedComponents,
  retrieveComponentsLayoutsToFetch,
} from '../utils/components';

describe('Content Manager | EditView | utils | components', () => {
  describe('getDefaultComponentValues', () => {
    it('should return an empty object if the args are empty', () => {
      expect(getDefaultComponentValues([], {})).toEqual({});
    });

    it('should return the correct data', () => {
      const component1 = {
        schema: {
          attributes: {
            title: {
              type: 'string',
              default: 'test',
            },
            description: {
              type: 'text',
            },
          },
        },
      };
      const component2 = {
        schema: {
          attributes: {
            otherTitle: {
              type: 'string',
              default: 'test',
            },
            otherDescription: {
              type: 'text',
            },
          },
        },
      };
      const component3 = {
        schema: {
          attributes: {
            otherTitle: {
              type: 'string',
            },
            otherDescription: {
              type: 'text',
            },
          },
        },
      };
      const component4 = {
        schema: {
          attributes: {
            otherTitle: {
              type: 'string',
            },
            otherDescription: {
              type: 'text',
            },
          },
        },
      };
      const component5 = {
        schema: {
          attributes: {
            otherTitle: {
              type: 'string',
            },
            otherDescription: {
              type: 'text',
            },
          },
        },
      };
      const components = [
        {
          key: 'component1',
          component: 'component1',
        },
        {
          key: 'component2',
          component: 'component2',
          repeatable: true,
          min: 1,
        },
        {
          key: 'component3',
          component: 'component3',
          repeatable: true,
        },
        {
          key: 'component4',
          component: 'component4',
        },
        {
          key: 'component5',
          component: 'component5',
          required: true,
          repeatable: true,
        },
        {
          key: 'component6',
          component: 'component5',
          min: 1,
          repeatable: true,
        },
      ];
      const componentLayouts = {
        component1,
        component2,
        component3,
        component4,
        component5,
      };
      const expected = {
        component1: {
          toSet: {
            title: 'test',
          },
          defaultRepeatable: {
            title: 'test',
          },
        },
        component2: {
          toSet: [{ _temp__id: 0, otherTitle: 'test' }],
          defaultRepeatable: {
            otherTitle: 'test',
          },
        },
        component3: {
          toSet: [],
          defaultRepeatable: {},
        },
        component4: {
          toSet: {},
          defaultRepeatable: {},
        },
        component5: {
          toSet: [],
          defaultRepeatable: {},
        },
        component6: {
          toSet: [{ _temp__id: 0 }],
          defaultRepeatable: {},
        },
      };

      expect(getDefaultComponentValues(components, componentLayouts)).toEqual(
        expected
      );
    });
  });

  describe('retrieveDisplayedComponents', () => {
    it('should return an array with all the components', () => {
      const attributes = {
        name: {
          maxLength: 50,
          required: true,
          minLength: 5,
          type: 'string',
        },
        cover: {
          model: 'file',
          via: 'related',
          plugin: 'upload',
        },
        menu: {
          model: 'menu',
          via: 'restaurant',
        },
        categories: {
          collection: 'category',
        },
        price_range: {
          enum: [
            'very_cheap',
            'cheap',
            'average',
            'expensive',
            'very_expensive',
          ],
          type: 'enumeration',
        },
        description: {
          type: 'richtext',
          required: true,
        },
        opening_times: {
          component: 'openingtimes',
          type: 'component',
          required: true,
          repeatable: true,
          min: 1,
          max: 10,
        },
        opening_times2: {
          component: 'openingtimes',
          type: 'component',
        },
        closing_period: {
          component: 'closingperiod',
          type: 'component',
        },
        services: {
          component: 'restaurantservice',
          required: true,
          repeatable: true,
          type: 'component',
        },
        address: {
          model: 'address',
        },
      };
      const expected = [
        {
          key: 'opening_times',
          component: 'openingtimes',
          repeatable: true,
          min: 1,
          isOpen: false,
        },
        {
          key: 'opening_times2',
          component: 'openingtimes',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'closing_period',
          component: 'closingperiod',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'services',
          component: 'restaurantservice',
          repeatable: true,
          isOpen: false,
          min: undefined,
        },
      ];

      expect(retrieveDisplayedComponents(attributes)).toEqual(expected);
    });
  });

  describe('retrieveComponentsLayoutsToFetch', () => {
    it('should return a filterd array of the components to fetch', () => {
      const components = [
        {
          key: 'opening_times',
          component: 'openingtimes',
          repeatable: true,
          min: 1,
          isOpen: false,
        },
        {
          key: 'opening_times2',
          component: 'openingtimes',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'closing_period',
          component: 'closingperiod',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'services',
          component: 'restaurantservice',
          repeatable: true,
          isOpen: false,
          min: undefined,
        },
      ];
      const expected = ['openingtimes', 'closingperiod', 'restaurantservice'];

      expect(retrieveComponentsLayoutsToFetch(components)).toEqual(expected);
    });
  });
});
