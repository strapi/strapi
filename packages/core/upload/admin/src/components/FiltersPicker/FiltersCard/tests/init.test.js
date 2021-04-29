import { fromJS } from 'immutable';
import init from '../init';

describe('UPLOAD | components | FiltersPicker | FilersCard | init', () => {
  it('should set the initialState correctly with the retrieved timestamps', () => {
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

    const timestamps = ['createdAtCustom', 'updatedAtCustom'];

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

    expect(init(state, timestamps)).toEqual(expected);
  });
});
