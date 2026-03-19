import { reducer, actions } from '../reducer';

import { initCT, init } from './utils';

describe('CTB | components | DataManagerProvider | reducer | EDIT_CUSTOM_FIELD_ATTRIBUTE', () => {
  it('edits a custom field attribute on a content type', () => {
    const contentTypeUID = 'api::address.address';
    const contentType = initCT('address', {
      attributes: [
        { name: 'test', type: 'string' },
        {
          name: 'custom_field',
          type: 'string',
          customField: 'plugin::mycustomfields.color',
        },
      ],
    });

    const initializedState = init({
      contentTypes: {
        [contentTypeUID]: contentType,
      },
    });

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
      name: 'custom_field',
    });

    const state = reducer(initializedState, action);

    expect(state.current.contentTypes[contentTypeUID]).toMatchObject({
      status: 'CHANGED',
      attributes: [{ name: 'test', type: 'string' }, updatedCustomFieldAttribute],
    });
  });
});
