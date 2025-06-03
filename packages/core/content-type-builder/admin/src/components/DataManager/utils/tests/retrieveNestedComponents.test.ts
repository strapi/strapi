import { retrieveNestedComponents } from '../retrieveNestedComponents';

import type { Components } from '../../../../types';

describe('CONTENT TYPE BUILDER | COMPONENTS | DataManagerProvider | utils | retrieveNestedComponents', () => {
  it('should return an array of nested components', () => {
    const components: Components = {
      'default.closingperiod': {
        uid: 'default.closingperiod',
        category: 'default',
        status: 'UNCHANGED',
        modelType: 'component',
        modelName: 'closingperiod',
        globalId: 'ComponentDefaultClosingperiod',
        info: {
          displayName: 'closingperiod',
          icon: 'angry',
          description: '',
        },
        attributes: [
          { type: 'string', name: 'label' },
          { type: 'date', required: true, name: 'start_date' },
          { type: 'date', required: true, name: 'end_date' },
          { type: 'media', multiple: false, required: false, name: 'media' },
          { component: 'default.dish', type: 'component', name: 'dish' },
        ],
        collectionName: 'components_closingperiods',
      },
      'default.dish': {
        uid: 'default.dish',
        category: 'default',
        status: 'UNCHANGED',
        modelType: 'component',
        modelName: 'dish',
        globalId: 'ComponentDefaultDish',
        info: {
          displayName: 'dish',
          icon: 'address-book',
          description: '',
        },
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
        collectionName: 'components_dishes',
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
        status: 'UNCHANGED',
        modelType: 'component',
        modelName: 'closingperiod',
        globalId: 'ComponentDefaultClosingperiod',
        info: {
          displayName: 'closingperiod',
          icon: 'angry',
          description: '',
        },
        attributes: [
          { type: 'string', name: 'label' },
          { type: 'date', required: true, name: 'start_date' },
          { type: 'date', required: true, name: 'end_date' },
          { type: 'media', multiple: false, required: false, name: 'media' },
          { component: 'default.dish', type: 'component', name: 'dish' },
        ],
        collectionName: 'components_closingperiods',
      },
      'default.dish': {
        uid: 'default.dish',
        category: 'default',
        status: 'UNCHANGED',
        modelType: 'component',
        modelName: 'dish',
        globalId: 'ComponentDefaultDish',
        info: {
          displayName: 'dish',
          icon: 'address-book',
          description: '',
        },
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
        collectionName: 'components_dishes',
      },

      'default.openingperiod': {
        uid: 'default.openingperiod',
        category: 'default',
        status: 'UNCHANGED',
        modelType: 'component',
        modelName: 'openingperiod',
        globalId: 'ComponentDefaultOpeningperiod',
        info: {
          displayName: 'openingperiod',
          icon: 'angry',
          description: '',
        },
        attributes: [{ component: 'default.dish', type: 'component', name: 'dish' }],
        collectionName: 'components_openingperiods',
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
