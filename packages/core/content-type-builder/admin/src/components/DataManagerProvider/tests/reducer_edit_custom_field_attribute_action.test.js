import cloneDeep from 'lodash/cloneDeep';
import reducer, { initialState } from '../reducer';
import { EDIT_CUSTOM_FIELD_ATTRIBUTE } from '../constants';

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

    const state = {
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

    const action = {
      type: EDIT_CUSTOM_FIELD_ATTRIBUTE,
      attributeToSet: updatedCustomFieldAttribute,
      forTarget: 'contentType',
      targetUid: contentTypeUID,
      initialAttribute: initialCustomFieldAttribute,
      shouldAddComponentToData: false,
    };

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
