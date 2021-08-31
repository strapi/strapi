import produce from 'immer';
import {
  GET_DATA,
  GET_DATA_SUCCEEDED,
  INIT_FORM,
  SET_DATA_STRUCTURES,
  SET_STATUS,
  SUBMIT_SUCCEEDED,
} from '../constants';
import crudReducer from '../reducer';

describe('CONTENT MANAGER | sharedReducers | crudReducer', () => {
  let state;

  beforeEach(() => {
    state = {
      componentsDataStructure: {},
      contentTypeDataStructure: {},
      isLoading: true,
      data: {},
      status: 'resolved',
    };
  });

  it('should handle the default case correctly', () => {
    expect(crudReducer(state, { type: 'test' })).toEqual(state);
  });

  it('should handle the GET_DATA action correctly', () => {
    state.isLoading = false;
    state.data = null;
    state.componentsDataStructure = null;

    const action = { type: GET_DATA };

    const expected = produce(state, draft => {
      draft.isLoading = true;
      draft.data = {};
    });

    expect(crudReducer(state, action)).toEqual(expected);
  });

  it('should handle the GET_DATA_SUCCEEDED action correctly', () => {
    const action = {
      type: GET_DATA_SUCCEEDED,
      data: 'test',
    };

    const expected = produce(state, draft => {
      draft.isLoading = false;
      draft.data = 'test';
    });

    expect(crudReducer(state, action)).toEqual(expected);
  });

  it('should handle the INIT_FORM action correctly', () => {
    const action = {
      type: INIT_FORM,
    };
    state.contentTypeDataStructure = { foo: 'bar' };

    const expected = produce(state, draft => {
      draft.isLoading = false;
      draft.data = { foo: 'bar' };
    });

    expect(crudReducer(state, action)).toEqual(expected);
  });

  it('should handle the SET_DATA_STRUCTURES action correctly', () => {
    const action = {
      type: SET_DATA_STRUCTURES,
      componentsDataStructure: { test: 'test' },
      contentTypeDataStructure: { foo: 'bar' },
    };

    const expected = produce(state, draft => {
      draft.componentsDataStructure = { test: 'test' };
      draft.contentTypeDataStructure = { foo: 'bar' };
    });

    expect(crudReducer(state, action)).toEqual(expected);
  });

  it('should handle the SET_STATUS action correctly', () => {
    const action = { type: SET_STATUS, status: 'pending' };

    const expected = produce(state, draft => {
      draft.status = 'pending';
    });

    expect(crudReducer(state, action)).toEqual(expected);
  });

  it('should handle the SUBMIt_SUCCEEDED action correctly', () => {
    const action = { type: SUBMIT_SUCCEEDED, data: 'test' };

    const expected = produce(state, draft => {
      draft.data = 'test';
    });

    expect(crudReducer(state, action)).toEqual(expected);
  });
});
