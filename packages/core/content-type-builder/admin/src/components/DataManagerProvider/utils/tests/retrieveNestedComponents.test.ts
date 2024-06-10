import { retrieveNestedComponents } from '../retrieveNestedComponents';

import type { Components } from '../../../../types';

describe('CONTENT TYPE BUILDER | COMPONENTS | DataManagerProvider | utils | retrieveNestedComponents', () => {
  it('should return an array of nested components', () => {
    const components: Components = {
      'default.closingperiod': {
        uid: 'default.closingperiod',
        category: 'default',
        apiId: 'closingperiod',
        schema: {
          icon: 'angry',
          name: 'closingperiod',
          description: '',
          collectionName: 'components_closingperiods',
          attributes: [
            { type: 'string', name: 'label' },
            { type: 'date', required: true, name: 'start_date' },
            { type: 'date', required: true, name: 'end_date' },
            { type: 'media', multiple: false, required: false, name: 'media' },
            { component: 'default.dish', type: 'component', name: 'dish' },
          ],
        },
      },
      'default.dish': {
        uid: 'default.dish',
        category: 'default',
        apiId: 'dish',
        schema: {
          icon: 'address-book',
          name: 'dish',
          description: '',
          collectionName: 'components_dishes',
          attributes: [
            { type: 'string', required: false, default: 'My super dish', name: 'name' },
            { type: 'text', name: 'description' },
            { type: 'float', name: 'price' },
            { type: 'media', multiple: false, required: false, name: 'picture' },
            { type: 'richtext', name: 'very_long_description' },
            {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              private: false,
              name: 'categories',
            },
          ],
        },
      },
    };

    const expected = [
      {
        component: 'default.dish',
        uidsOfAllParents: ['default.closingperiod'],
      },
    ];

    expect(retrieveNestedComponents(components)).toEqual(expected);
  });

  it('should return both parents', () => {
    const components: Components = {
      'default.closingperiod': {
        uid: 'default.closingperiod',
        category: 'default',
        apiId: 'closingperiod',
        schema: {
          icon: 'angry',
          name: 'closingperiod',
          description: '',
          collectionName: 'components_closingperiods',
          attributes: [
            { type: 'string', name: 'label' },
            { type: 'date', required: true, name: 'start_date' },
            { type: 'date', required: true, name: 'end_date' },
            { type: 'media', multiple: false, required: false, name: 'media' },
            { component: 'default.dish', type: 'component', name: 'dish' },
          ],
        },
      },
      'default.dish': {
        uid: 'default.dish',
        category: 'default',
        apiId: 'dish',
        schema: {
          icon: 'address-book',
          name: 'dish',
          description: '',
          collectionName: 'components_dishes',
          attributes: [
            { type: 'string', required: false, default: 'My super dish', name: 'name' },
            { type: 'text', name: 'description' },
            { type: 'float', name: 'price' },
            { type: 'media', multiple: false, required: false, name: 'picture' },
            { type: 'richtext', name: 'very_long_description' },
            {
              type: 'relation',
              relation: 'oneToOne',
              target: 'api::category.category',
              targetAttribute: null,
              private: false,
              name: 'categories',
            },
          ],
        },
      },

      'default.openingperiod': {
        uid: 'default.openingperiod',
        category: 'default',
        apiId: 'openingperiod',
        schema: {
          icon: 'angry',
          name: 'openingperiod',
          description: '',
          collectionName: 'components_openingperiods',
          attributes: [{ component: 'default.dish', type: 'component', name: 'dish' }],
        },
      },
    };

    const expected = [
      {
        component: 'default.dish',
        uidsOfAllParents: ['default.closingperiod', 'default.openingperiod'],
      },
    ];

    expect(retrieveNestedComponents(components)).toEqual(expected);
  });
});
