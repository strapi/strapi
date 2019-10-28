import {
  getDefaultGroupValues,
  retrieveDisplayedGroups,
  retrieveGroupLayoutsToFetch,
} from '../utils/groups';

describe('Content Manager | EditView | utils | groups', () => {
  describe('getDefaultGroupValues', () => {
    it('should return an empty object if the args are empty', () => {
      expect(getDefaultGroupValues([], {})).toEqual({});
    });

    it('should return the correct data', () => {
      const group1 = {
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
      const group2 = {
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
      const group3 = {
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
      const group4 = {
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
      const group5 = {
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
      const groups = [
        {
          key: 'group1',
          group: 'group1',
        },
        {
          key: 'group2',
          group: 'group2',
          repeatable: true,
          min: 1,
        },
        {
          key: 'group3',
          group: 'group3',
          repeatable: true,
        },
        {
          key: 'group4',
          group: 'group4',
        },
        {
          key: 'group5',
          group: 'group5',
          required: true,
          repeatable: true,
        },
        {
          key: 'group6',
          group: 'group5',
          min: 1,
          repeatable: true,
        },
      ];
      const groupLayouts = {
        group1,
        group2,
        group3,
        group4,
        group5,
      };
      const expected = {
        group1: {
          toSet: {
            title: 'test',
          },
          defaultRepeatable: {
            title: 'test',
          },
        },
        group2: {
          toSet: [{ _temp__id: 0, otherTitle: 'test' }],
          defaultRepeatable: {
            otherTitle: 'test',
          },
        },
        group3: {
          toSet: [],
          defaultRepeatable: {},
        },
        group4: {
          toSet: {},
          defaultRepeatable: {},
        },
        group5: {
          toSet: [],
          defaultRepeatable: {},
        },
        group6: {
          toSet: [{ _temp__id: 0 }],
          defaultRepeatable: {},
        },
      };

      expect(getDefaultGroupValues(groups, groupLayouts)).toEqual(expected);
    });
  });

  describe('retrieveDisplayedGroups', () => {
    it('should return an array with all the groups', () => {
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
          group: 'openingtimes',
          type: 'group',
          required: true,
          repeatable: true,
          min: 1,
          max: 10,
        },
        opening_times2: {
          group: 'openingtimes',
          type: 'group',
        },
        closing_period: {
          group: 'closingperiod',
          type: 'group',
        },
        services: {
          group: 'restaurantservice',
          required: true,
          repeatable: true,
          type: 'group',
        },
        address: {
          model: 'address',
        },
      };
      const expected = [
        {
          key: 'opening_times',
          group: 'openingtimes',
          repeatable: true,
          min: 1,
          isOpen: false,
        },
        {
          key: 'opening_times2',
          group: 'openingtimes',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'closing_period',
          group: 'closingperiod',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'services',
          group: 'restaurantservice',
          repeatable: true,
          isOpen: false,
          min: undefined,
        },
      ];

      expect(retrieveDisplayedGroups(attributes)).toEqual(expected);
    });
  });

  describe('retrieveGroupLayoutsToFetch', () => {
    it('should return a filterd array of the groups to fetch', () => {
      const groups = [
        {
          key: 'opening_times',
          group: 'openingtimes',
          repeatable: true,
          min: 1,
          isOpen: false,
        },
        {
          key: 'opening_times2',
          group: 'openingtimes',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'closing_period',
          group: 'closingperiod',
          isOpen: true,
          min: undefined,
          repeatable: undefined,
        },
        {
          key: 'services',
          group: 'restaurantservice',
          repeatable: true,
          isOpen: false,
          min: undefined,
        },
      ];
      const expected = ['openingtimes', 'closingperiod', 'restaurantservice'];

      expect(retrieveGroupLayoutsToFetch(groups)).toEqual(expected);
    });
  });
});
