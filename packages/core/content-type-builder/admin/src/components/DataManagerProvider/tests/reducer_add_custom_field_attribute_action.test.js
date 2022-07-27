import cloneDeep from 'lodash/cloneDeep';
import reducer, { initialState } from '../reducer';
import { ADD_CUSTOM_FIELD_ATTRIBUTE } from '../constants';

describe('CTB | components | DataManagerProvider | reducer | ADD_CUSTOM_FIELD_ATTRIBUTE', () => {
  it('adds a custom field to a contentType', () => {
    const contentType = {
      uid: 'api::test.test',
      schema: {
        name: 'test',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: [{ name: 'test', type: 'string' }],
      },
    };

    const action = {
      type: ADD_CUSTOM_FIELD_ATTRIBUTE,
      attributeToSet: {
        type: 'string',
        name: 'color',
        options: { format: 'hex' },
      },
      forTarget: 'contentType',
      targetUid: 'api::test.test',
      initialAttribute: {},
    };

    const state = {
      ...initialState,
      modifiedData: {
        components: {},
        contentType,
      },
    };

    const updatedContentType = cloneDeep(contentType);
    updatedContentType.schema.attributes.push({
      name: 'color',
      // The type is converted to customField on the server,
      // The underlying data type is expected here
      type: 'string',
      options: {
        format: 'hex',
      },
    });

    const expected = {
      ...initialState,
      modifiedData: {
        components: {},
        contentType: updatedContentType,
      },
    };

    expect(reducer(state, action)).toEqual(expected);
  });
});
