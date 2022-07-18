import reducer from '../reducer';

const initialData = {
  collectionTypes: {
    'api::category': {
      create: false,
      findOne: false,
      find: false,
      update: false,
      delete: false,
    },
    'api::country': {
      create: false,
      findOne: false,
      find: false,
      update: false,
      delete: false,
    },
  },
  singleTypes: {
    'api::homepage': {
      create: false,
      delete: false,
      update: false,
    },
  },
  custom: {},
};

const initialState = {
  initialData,
  modifiedData: initialData,
};

describe('ADMIN | Pages | API TOKENS | EditView | reducer', () => {
  it('should return the initialState when the type is undefined', () => {
    const action = { type: undefined };

    expect(reducer(initialState, action)).toEqual(initialState);
  });

  it('should set all actions in a specific contentType to true', () => {
    const action = {
      type: 'ON_CHANGE_SELECT_ALL',
      value: true,
      keys: ['collectionTypes', 'api::category'],
    };

    expect(reducer(initialState, action).modifiedData).toEqual({
      collectionTypes: {
        'api::category': {
          create: true,
          findOne: true,
          find: true,
          update: true,
          delete: true,
        },
        'api::country': {
          create: false,
          findOne: false,
          find: false,
          update: false,
          delete: false,
        },
      },
      singleTypes: {
        'api::homepage': {
          create: false,
          delete: false,
          update: false,
        },
      },
      custom: {},
    });
  });

  it('should set actions to only read-only on a specific contentType to true', () => {
    const action = {
      type: 'ON_CHANGE_READ_ONLY',
      value: false,
      keys: ['collectionTypes', 'api::category'],
    };

    expect(reducer(initialState, action).modifiedData).toEqual({
      collectionTypes: {
        'api::category': {
          create: false,
          findOne: true,
          find: true,
          update: false,
          delete: false,
        },
        'api::country': {
          create: false,
          findOne: false,
          find: false,
          update: false,
          delete: false,
        },
      },
      singleTypes: {
        'api::homepage': {
          create: false,
          delete: false,
          update: false,
        },
      },
      custom: {},
    });
  });

  it('should toggle a specific action', () => {
    const action = {
      type: 'ON_CHANGE',
      value: true,
      name: 'collectionTypes.api::category.update',
    };

    expect(reducer(initialState, action).modifiedData).toEqual({
      collectionTypes: {
        'api::category': {
          create: false,
          findOne: false,
          find: false,
          update: true,
          delete: false,
        },
        'api::country': {
          create: false,
          findOne: false,
          find: false,
          update: false,
          delete: false,
        },
      },
      singleTypes: {
        'api::homepage': {
          create: false,
          delete: false,
          update: false,
        },
      },
      custom: {},
    });
  });
});
