import cloneDeep from 'lodash/cloneDeep';

import { initialState, reducer, actions } from '../reducer';

describe('CTB | components | DataManagerProvider | reducer | EDIT_CUSTOM_FIELD_ATTRIBUTE', () => {
  it('edits a custom field attribute on a content type', () => {
    const initialCustomFieldAttribute = {
      name: 'custom_field',
      type: 'string',
      customField: 'plugin::mycustomfields.color',
    };

    const contentTypeUID = 'api::address.address';
    const contentType = {
      uid: contentTypeUID,
      schema: {
        name: 'address',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: [{ name: 'test', type: 'string' }, initialCustomFieldAttribute],
      },
    };

    const state: any = {
      ...initialState,
      contentTypes: { [contentTypeUID]: contentType },
      initialContentTypes: { [contentTypeUID]: contentType },
      modifiedData: {
        components: {},
        contentType,
      },
    };

    const updatedCustomFieldAttribute = {
      type: 'string',
      options: {
        format: 'hex',
      },
      name: 'color_picker_hex',
      customField: 'plugin::mycustomfields.color',
    };

    const action = actions.editCustomFieldAttribute({
      attributeToSet: updatedCustomFieldAttribute,
      forTarget: 'contentType',
      targetUid: contentTypeUID,
      initialAttribute: initialCustomFieldAttribute,
    });

    const updatedContentType = cloneDeep(contentType);
    updatedContentType.schema.attributes = [
      { name: 'test', type: 'string' },
      updatedCustomFieldAttribute,
    ];

    const expected = {
      ...initialState,
      contentTypes: { [contentTypeUID]: contentType },
      initialContentTypes: { [contentTypeUID]: contentType },
      modifiedData: {
        components: {},
        contentType: updatedContentType,
      },
    };

    expect(reducer(state, action)).toEqual(expected);
  });
});
