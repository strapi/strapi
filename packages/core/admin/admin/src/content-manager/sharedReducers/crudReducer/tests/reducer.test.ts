import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  INIT_FORM,
  SET_DATA_STRUCTURES,
  SET_STATUS,
  SUBMIT_SUCCEEDED,
} from '../constants';
import { CrudState, reducer as crudReducer } from '../reducer';

describe('CONTENT MANAGER | sharedReducers | crudReducer', () => {
  let state: CrudState;

  beforeEach(() => {
    state = {
      componentsDataStructure: {},
      contentTypeDataStructure: {},
      isLoading: true,
      data: {},
      setModifiedDataOnly: false,
      status: 'resolved',
    };
  });

  it('should handle the default case correctly', () => {
    // @ts-expect-error – testing that it handles the default case correctly
    expect(crudReducer(state, { type: 'test' })).toEqual(state);
  });

  it('should handle the GET_DATA action correctly', () => {
    state.isLoading = false;
    state.data = null;

    const action = { type: GET_DATA } as const;

    expect(crudReducer(state, action)).toMatchInlineSnapshot(`
      {
        "componentsDataStructure": {},
        "contentTypeDataStructure": {},
        "data": null,
        "isLoading": true,
        "setModifiedDataOnly": false,
        "status": "resolved",
      }
    `);
  });

  it('should handle the GET_DATA_SUCCEEDED action correctly', () => {
    const action = {
      type: GET_DATA_SUCCEEDED,
      data: {
        name: 'test',
      },
    } as const;

    expect(crudReducer(state, action)).toMatchInlineSnapshot(`
      {
        "componentsDataStructure": {},
        "contentTypeDataStructure": {},
        "data": {
          "name": "test",
        },
        "isLoading": false,
        "setModifiedDataOnly": false,
        "status": "resolved",
      }
    `);
  });

  it('should handle the INIT_FORM action correctly', () => {
    const action = {
      type: INIT_FORM,
    } as const;

    state.contentTypeDataStructure = { foo: 'bar' };

    expect(crudReducer(state, action)).toMatchInlineSnapshot(`
      {
        "componentsDataStructure": {},
        "contentTypeDataStructure": {
          "foo": "bar",
        },
        "data": {
          "foo": "bar",
        },
        "isLoading": false,
        "setModifiedDataOnly": false,
        "status": "resolved",
      }
    `);
  });

  it('should handle the SET_DATA_STRUCTURES action correctly', () => {
    const action = {
      type: SET_DATA_STRUCTURES,
      componentsDataStructure: { test: 'test' },
      contentTypeDataStructure: { foo: 'bar' },
    } as const;

    expect(crudReducer(state, action)).toMatchInlineSnapshot(`
      {
        "componentsDataStructure": {
          "test": "test",
        },
        "contentTypeDataStructure": {
          "foo": "bar",
        },
        "data": {},
        "isLoading": true,
        "setModifiedDataOnly": false,
        "status": "resolved",
      }
    `);
  });

  it('should handle the SET_STATUS action correctly', () => {
    const action = { type: SET_STATUS, status: 'pending' } as const;

    expect(crudReducer(state, action)).toMatchInlineSnapshot(`
      {
        "componentsDataStructure": {},
        "contentTypeDataStructure": {},
        "data": {},
        "isLoading": true,
        "setModifiedDataOnly": false,
        "status": "pending",
      }
    `);
  });

  it('should handle the SUBMIT_SUCCEEDED action correctly', () => {
    const action = {
      type: SUBMIT_SUCCEEDED,
      data: {
        time: 'test',
      },
    } as const;

    expect(crudReducer(state, action)).toMatchInlineSnapshot(`
      {
        "componentsDataStructure": {},
        "contentTypeDataStructure": {},
        "data": {
          "time": "test",
        },
        "isLoading": true,
        "setModifiedDataOnly": false,
        "status": "resolved",
      }
    `);
  });
});
