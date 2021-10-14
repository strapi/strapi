import createHeadersArray from '../createHeadersArray';

describe('FormModal | utils | createHeadersArray', () => {
  it('should return an empty array if no header key is set', () => {
    const data = {
      actionType: null,
      attributeName: null,
      attributeType: null,
      dynamicZoneTarget: null,
      forTarget: null,
      modalType: null,
      pathToSchema: [],
      settingType: null,
      step: null,
      targetUid: null,
      header_label_1: null,
      header_info_category_1: null,
      header_info_name_1: null,
      header_label_2: null,
      header_info_category_2: null,
      header_info_name_2: null,
      header_label_3: null,
      header_info_category_3: null,
      header_info_name_3: null,
    };

    expect(createHeadersArray(data)).toEqual([]);
  });

  it('should return an array containing a header object', () => {
    const data = {
      actionType: 'something',
      attributeName: null,
      attributeType: null,
      dynamicZoneTarget: null,
      forTarget: null,
      modalType: null,
      pathToSchema: [],
      settingType: null,
      step: null,
      targetUid: null,
      header_label_1: 'restaurant',
      header_info_category_1: null,
      header_info_name_1: null,
      header_label_2: null,
      header_info_category_2: null,
      header_info_name_2: null,
      header_label_3: null,
      header_info_category_3: null,
      header_info_name_3: null,
    };
    const expected = [
      {
        label: 'restaurant',

        info: {
          name: null,
          category: null,
        },
      },
    ];

    expect(createHeadersArray(data)).toEqual(expected);
  });

  it('should handle multiple headers correctly', () => {
    const data = {
      actionType: 'something',
      attributeName: null,
      attributeType: null,
      dynamicZoneTarget: null,
      forTarget: null,

      modalType: null,
      pathToSchema: [],
      settingType: null,
      step: null,

      targetUid: null,
      header_label_1: 'restaurant',
      header_info_category_1: null,
      header_info_name_1: null,
      header_label_2: 'closing period',
      header_info_category_2: 'default',
      header_info_name_2: 'closingperiod',
      header_label_3: null,
      header_info_category_3: null,
      header_info_name_3: null,
    };

    const expected = [
      {
        label: 'restaurant',

        info: {
          name: null,
          category: null,
        },
      },
      {
        label: 'closing period',

        info: {
          name: 'closingperiod',
          category: 'default',
        },
      },
    ];

    expect(createHeadersArray(data)).toEqual(expected);
  });
});
