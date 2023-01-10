import reducer from '../reducer';
import { data } from '../utils/tests/dataMock';
import init from '../init';

describe('ADMIN | Pages | API TOKENS | EditView | reducer', () => {
  const initialState = init({}, data.data);

  it('should return the initialState when the type is undefined', () => {
    const action = { type: undefined };

    expect(reducer(initialState, action)).toEqual(initialState);
  });

  it('should select a specific action', () => {
    const action = {
      type: 'ON_CHANGE',
      value: 'api::address.address.find',
    };

    expect(reducer(initialState, action).selectedActions).toEqual(['api::address.address.find']);
  });

  it('should select all actions of a permission', () => {
    const action = {
      type: 'SELECT_ALL_IN_PERMISSION',
      value: [
        {
          action: 'find',
          actionId: 'api::category.category.find',
        },
        {
          action: 'findOne',
          actionId: 'api::category.category.findOne',
        },
        {
          action: 'create',
          actionId: 'api::category.category.create',
        },
        {
          action: 'update',
          actionId: 'api::category.category.update',
        },
        {
          action: 'delete',
          actionId: 'api::category.category.delete',
        },
        {
          action: 'createLocalization',
          actionId: 'api::category.category.createLocalization',
        },
      ],
    };

    expect(reducer(initialState, action).selectedActions).toEqual([
      'api::category.category.find',
      'api::category.category.findOne',
      'api::category.category.create',
      'api::category.category.update',
      'api::category.category.delete',
      'api::category.category.createLocalization',
    ]);
  });

  it('should select all actions', () => {
    const action = {
      type: 'SELECT_ALL_ACTIONS',
    };

    expect(reducer(initialState, action).selectedActions).toEqual(initialState.data.allActionsIds);
  });

  it('should select read-only actions', () => {
    const action = {
      type: 'ON_CHANGE_READ_ONLY',
    };

    expect(reducer(initialState, action).selectedActions).toEqual([
      'api::address.address.find',
      'api::address.address.findOne',
      'api::category.category.find',
      'api::category.category.findOne',
    ]);
  });

  it('should update all selected actions', () => {
    const action = {
      type: 'UPDATE_PERMISSIONS',
      value: [
        'api::address.address.find',
        'api::address.address.findOne',
        'api::category.category.find',
        'api::category.category.findOne',
      ],
    };

    expect(reducer(initialState, action).selectedActions).toEqual([
      'api::address.address.find',
      'api::address.address.findOne',
      'api::category.category.find',
      'api::category.category.findOne',
    ]);
  });

  it('should add a selectedAction', () => {
    const action = {
      type: 'SET_SELECTED_ACTION',
      value: 'api::address.address.find',
    };

    expect(reducer(initialState, action).selectedAction).toBe('api::address.address.find');
  });
});
