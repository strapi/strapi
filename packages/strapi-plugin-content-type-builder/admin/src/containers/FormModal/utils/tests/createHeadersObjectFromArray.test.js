import createHeadersObjectFromArray from '../createHeadersObjectFromArray';

describe('FormModal | utils | createHeadersArray', () => {
  it('should return a header object', () => {
    const data = [
      {
        label: 'test',
        icon: {
          name: 'contentType',
          isCustom: false,
        },
        info: {
          name: null,
          category: null,
        },
      },
      {
        label: 'test2',
        icon: {
          name: 'book',
          isCustom: true,
        },
        info: {
          name: 'something',
          category: 'default',
        },
      },
    ];

    const expected = {
      header_label_1: 'test',
      header_icon_name_1: 'contentType',
      header_icon_isCustom_1: false,
      header_info_name_1: null,
      header_info_category_1: null,
      header_label_2: 'test2',
      header_icon_name_2: 'book',
      header_icon_isCustom_2: true,
      header_info_name_2: 'something',
      header_info_category_2: 'default',
    };

    expect(createHeadersObjectFromArray(data)).toEqual(expected);
  });
});
