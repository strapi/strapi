import { getDataSucceeded } from '../actions';
import appReducer, { initialState } from '../reducer';

describe('appReducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  it('returns the initial state', () => {
    expect(appReducer(undefined, {})).toEqual(initialState);
  });

  it('should handle the getDataSucceeded action correctly', () => {
    const models = [
      { icon: 'fa-cube', name: 'permission', description: '', fields: 6, source: 'users-permissions' },
    ];
    const allModels = [
      {
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
        attributes: [
          {
            name: 'type',
            params: { type: 'string', required: true, configurable: false },
          },
          {
            name: 'controller',
            params: { type: 'string', required: true, configurable: false },
          },
        ],
      },
    ];
    const initialData = {
      permission: {
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
        attributes: {
          type: {
            type: 'string',
            required: true,
            configurable: false,
          },
          controller: {
            type: 'string',
            required: true,
            configurable: false,
          },
        },
      },
    };
    const expected = state
      .update('initialData', () => initialData)
      .update('models', () => models)
      .update('modifiedData', () => initialData);
    
    expect(appReducer(initialState, getDataSucceeded({ models, allModels }))).toEqual(expected);
  });
});
