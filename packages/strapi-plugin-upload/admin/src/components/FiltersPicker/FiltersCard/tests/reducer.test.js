import { fromJS } from 'immutable';
import reducer, { initialState } from '../reducer';

describe('Upload | components | FiltersCard | reducer', () => {
  it('should return the state with the default value', () => {
    const state = initialState;

    const action = {
      type: 'ON_CHANGE',
      name: 'name',
      value: 'size',
    };

    const actual = reducer(state, action);
    const expected = state.set('name', 'size').set('value', '0KB');

    expect(actual).toEqual(expected);
  });

  it('should return the state with the updated value', () => {
    const state = initialState;

    const action = {
      type: 'ON_CHANGE',
      name: 'filter',
      value: '>',
    };

    const actual = reducer(state, action);
    const expected = state.set('filter', '>');

    expect(actual).toEqual(expected);
  });
  it('should return the updated filters form with custom timestamps', () => {
    const state = fromJS({
      name: 'created_at',
      filter: '=',
      value: 'test',
      filtersForm: {
        created_at: {
          type: 'datetime',
          defaultFilter: '=',
          defaultValue: 'test1',
        },
        updated_at: {
          type: 'datetime',
          defaultFilter: '=',
          defaultValue: 'test2',
        },
        size: {
          type: 'integer',
          defaultFilter: '=',
          defaultValue: '0KB',
        },
        mime: {
          type: 'enum',
          defaultFilter: '_contains',
          defaultValue: 'image',
        },
      },
    });

    const action = {
      type: 'HANDLE_CUSTOM_TIMESTAMPS',
      timestamps: ['createdAtCustom', 'updatedAtCustom'],
    };

    const expected = fromJS({
      name: 'createdAtCustom',
      filter: '=',
      value: 'test',
      filtersForm: {
        createdAtCustom: {
          type: 'datetime',
          defaultFilter: '=',
          defaultValue: 'test1',
        },
        updatedAtCustom: {
          type: 'datetime',
          defaultFilter: '=',
          defaultValue: 'test2',
        },
        size: {
          type: 'integer',
          defaultFilter: '=',
          defaultValue: '0KB',
        },
        mime: {
          type: 'enum',
          defaultFilter: '_contains',
          defaultValue: 'image',
        },
      },
    });

    expect(reducer(state, action)).toEqual(expected);
  });

  it('should return the initialState on reset', () => {
    const state = initialState.set('filter', '>');

    const action = {
      type: 'RESET_FORM',
    };

    const actual = reducer(state, action);
    const expected = initialState;

    expect(actual).toEqual(expected);
  });
});
