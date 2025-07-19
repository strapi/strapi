import { reducer, actions, type State } from '../reducer';

import { initCT, initCompo, init as initUtils } from './utils';

import type { Struct } from '@strapi/types';

const baseContentType = initCT('test', {});
const baseComponent = initCompo('test', {});

const init = () => {
  return initUtils({
    components: {
      'default.test': baseComponent,
    },
    contentTypes: {
      'api::test.test': baseContentType,
    },
  });
};

const getType = (
  state: State,
  {
    forTarget,
    targetUid,
  }: {
    forTarget: Struct.ModelType;
    targetUid: string;
  }
) => {
  return state.current[forTarget === 'contentType' ? 'contentTypes' : 'components'][targetUid];
};

describe.each<{ forTarget: Struct.ModelType; targetUid: string }>([
  { forTarget: 'contentType', targetUid: 'api::test.test' },
  { forTarget: 'component', targetUid: 'default.test' },
])('DataManager | reducer | addCustomFieldAttribute (%s)', ({ forTarget, targetUid }) => {
  it('adds a custom field attribute correctly', () => {
    const initializedState = init();

    const customFieldAttribute = {
      type: 'string',
      name: 'color',
      options: { format: 'hex' },
      customField: 'plugin::mycustomfields.color',
    };

    const state = reducer(
      initializedState,
      actions.addCustomFieldAttribute({
        attributeToSet: customFieldAttribute,
        forTarget,
        targetUid,
      })
    );

    const type = getType(state, { forTarget, targetUid });

    expect(type).toMatchObject({
      status: 'CHANGED',
      attributes: [
        {
          ...customFieldAttribute,
          status: 'NEW',
        },
      ],
    });
  });

  it('should not override status when adding a custom field attribute', () => {
    const initializedState = init();

    const customFieldAttribute = {
      type: 'string',
      name: 'color',
      options: { format: 'hex' },
      customField: 'plugin::mycustomfields.color',
      status: 'SOMETHING_ELSE', // Attempt to override status
    };

    const state = reducer(
      initializedState,
      actions.addCustomFieldAttribute({
        attributeToSet: customFieldAttribute,
        forTarget,
        targetUid,
      })
    );

    const type = getType(state, { forTarget, targetUid });

    expect(type.attributes[0].status).toBe('NEW'); // Status should always be NEW
  });

  it('should add a custom field attribute with various configurations', () => {
    const initializedState = init();

    const configurations = [
      {
        type: 'string',
        name: 'colorHex',
        customField: 'plugin::mycustomfields.color',
        options: { format: 'hex' },
      },
      {
        type: 'string',
        name: 'colorRgb',
        customField: 'plugin::mycustomfields.color',
        options: { format: 'rgb' },
        required: true,
      },
      {
        type: 'json',
        name: 'coordinates',
        customField: 'plugin::mycustomfields.location',
        options: { defaultLat: 0, defaultLng: 0 },
      },
    ];

    let state = initializedState;

    for (const config of configurations) {
      state = reducer(
        state,
        actions.addCustomFieldAttribute({
          attributeToSet: config,
          forTarget,
          targetUid,
        })
      );
    }

    const type = getType(state, { forTarget, targetUid });

    expect(type.attributes).toHaveLength(configurations.length);

    configurations.forEach((config, index) => {
      expect(type.attributes[index]).toMatchObject({
        ...config,
        status: 'NEW',
      });
    });

    expect(type.status).toBe('CHANGED');
  });
});
