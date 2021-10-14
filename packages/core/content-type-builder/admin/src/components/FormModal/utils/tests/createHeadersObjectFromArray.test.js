import createHeadersObjectFromArray from '../createHeadersObjectFromArray';

describe('FormModal | utils | createHeadersArray', () => {
  it('should return a header object', () => {
    const data = [
      {
        label: 'test',

        info: {
          name: null,
          category: null,
        },
      },
      {
        label: 'test2',

        info: {
          name: 'something',
          category: 'default',
        },
      },
    ];

    const expected = {
      header_label_1: 'test',

      header_info_name_1: null,
      header_info_category_1: null,
      header_label_2: 'test2',

      header_info_name_2: 'something',
      header_info_category_2: 'default',
    };

    expect(createHeadersObjectFromArray(data)).toEqual(expected);
  });
});
