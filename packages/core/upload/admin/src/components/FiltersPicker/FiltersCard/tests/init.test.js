import init from '../init';

describe('UPLOAD | components | FiltersPicker | FilersCard | init', () => {
  it('should set the initialState correctly with the retrieved timestamps', () => {
    const state = {
      name: 'createdAt',
      filter: '=',
      value: 'test',
      filtersForm: {
        createdAt: {
          type: 'datetime',
          defaultFilter: '=',
          defaultValue: 'test1',
        },
        updatedAt: {
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
    };

    const timestamps = ['createdAtCustom', 'updatedAtCustom'];

    const expected = {
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
    };

    expect(init(state, timestamps)).toEqual(expected);
  });
});
