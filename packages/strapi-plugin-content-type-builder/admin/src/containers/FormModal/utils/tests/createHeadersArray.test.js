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
      headerId: null,
      header_label_1: null,
      header_icon_name_1: null,
      header_icon_isCustom_1: null,
      header_info_category_1: null,
      header_info_name_1: null,
      header_label_2: null,
      header_icon_name_2: null,
      header_icon_isCustom_2: null,
      header_info_category_2: null,
      header_info_name_2: null,
      header_label_3: null,
      header_icon_name_3: null,
      header_icon_isCustom_3: null,
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
      headerId: null,
      header_label_1: 'restaurant',
      header_icon_name_1: 'contentType',
      header_icon_isCustom_1: 'false',
      header_info_category_1: null,
      header_info_name_1: null,
      header_label_2: null,
      header_icon_name_2: null,
      header_icon_isCustom_2: null,
      header_info_category_2: null,
      header_info_name_2: null,
      header_label_3: null,
      header_icon_name_3: null,
      header_icon_isCustom_3: null,
      header_info_category_3: null,
      header_info_name_3: null,
    };
    const expected = [
      {
        label: 'restaurant',
        icon: {
          name: 'contentType',
          isCustom: false,
        },
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
      headerId: null,
      header_label_1: 'restaurant',
      header_icon_name_1: 'bool',
      header_icon_isCustom_1: 'true',
      header_info_category_1: null,
      header_info_name_1: null,
      header_label_2: 'closing period',
      header_icon_name_2: null,
      header_icon_isCustom_2: null,
      header_info_category_2: 'default',
      header_info_name_2: 'closingperiod',
      header_label_3: null,
      header_icon_name_3: null,
      header_icon_isCustom_3: null,
      header_info_category_3: null,
      header_info_name_3: null,
    };

    const expected = [
      {
        label: 'restaurant',
        icon: {
          name: 'bool',
          isCustom: true,
        },
        info: {
          name: null,
          category: null,
        },
      },
      {
        label: 'closing period',
        icon: {
          name: null,
          isCustom: false,
        },
        info: {
          name: 'closingperiod',
          category: 'default',
        },
      },
    ];

    expect(createHeadersArray(data)).toEqual(expected);
  });
});
