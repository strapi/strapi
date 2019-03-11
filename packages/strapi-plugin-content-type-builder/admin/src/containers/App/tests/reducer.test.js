import { fromJS, List } from 'immutable';
import { getDataSucceeded, deleteModelSucceeded } from '../actions';
import appReducer, { initialState } from '../reducer';

describe('appReducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      connections: [],
      initialData: {},
      isLoading: true,
      models: [],
      modifiedData: {},
      newContentType: {
        collectionName: "",
        connection: "",
        description: "",
        mainField: "",
        attributes: {},
      },
    });
  });

  it('returns the initial state', () => {
    expect(appReducer(undefined, {})).toEqual(initialState);
  });

  it('should handle the deleteModelSucceeded action correctly', () => {
    const models = [
      { icon: 'fa-cube', name: 'permission', description: '', fields: 6, source: 'users-permissions' },
      { icon: 'fa-cube', name: 'user', description: '', fields: 6, source: 'users-permissions' },
      { icon: 'fa-cube', name: 'product', description: 'super api', fields: 6 },
    ];
    const updatedModels = [
      { icon: 'fa-cube', name: 'permission', description: '', fields: 6, source: 'users-permissions' },
      { icon: 'fa-cube', name: 'user', description: '', fields: 6, source: 'users-permissions' },
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
      user: {
        collectionName: 'users-permissions_user',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'user',
        attributes: {
          username: {
            type: 'string',
            required: true,
            configurable: false,
          },
        },
      },
      product: {
        collectionName: '',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'product',
        attributes: {
          name: {
            type: 'string',
            required: true,
          },
        },
      },
    };
    const updatedData = {
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
      user: {
        collectionName: 'users-permissions_user',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'user',
        attributes: {
          username: {
            type: 'string',
            required: true,
            configurable: false,
          },
        },
      },
    };

    const newState = fromJS({
      models,
      initialData,
      modifiedData: initialData,
    });

    const expected = fromJS({
      models: updatedModels,
      initialData: updatedData,
      modifiedData: updatedData,
    });

    expect(appReducer(newState, deleteModelSucceeded('product'))).toEqual(expected);
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
    const connections = ['default'];
    const expected = state
      .update('connections', () => List(connections))
      .update('initialData', () => initialData)
      .update('isLoading', () => false)
      .update('models', () => models)
      .updateIn(['newContentType', 'connection'], () => 'default')
      .update('modifiedData', () => initialData);

    expect(appReducer(state, getDataSucceeded({ models, allModels }, connections))).toEqual(expected);
  });
});
