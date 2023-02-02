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

    const newCustomFieldAttribute = {
      // The underlying data type should be in the action and expected
      // The type is converted to customField on the server,
      type: 'string',
      name: 'color',
      options: { format: 'hex' },
      customField: 'plugin::mycustomfields.color',
    };

    const action = {
      type: ADD_CUSTOM_FIELD_ATTRIBUTE,
      attributeToSet: newCustomFieldAttribute,
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
    updatedContentType.schema.attributes.push(newCustomFieldAttribute);

    const expected = {
      ...initialState,
      modifiedData: {
        components: {},
        contentType: updatedContentType,
      },
    };

    expect(reducer(state, action)).toEqual(expected);
  });

  it('adds a custom field to a component', () => {
    const componentSchema = {
      uid: 'basic.simple',
      category: 'basic',
      schema: {
        icon: 'ambulance',
        name: 'simple',
        description: '',
        connection: 'basic',
        collectionName: 'components_basic_simples',
        attributes: [
          { type: 'string', required: true, name: 'name' },
          { type: 'string', name: 'test' },
        ],
      },
    };

    const newCustomFieldAttribute = {
      // The underlying data type should be in the action and expected
      // The type is converted to customField on the server,
      type: 'string',
      name: 'color',
      options: { format: 'hex' },
      customField: 'plugin::mycustomfields.color',
    };

    const action = {
      type: ADD_CUSTOM_FIELD_ATTRIBUTE,
      attributeToSet: newCustomFieldAttribute,
      forTarget: 'component',
      targetUid: 'basic.simple',
      initialAttribute: {},
    };

    const state = {
      ...initialState,
      modifiedData: {
        components: {},
        component: componentSchema,
      },
    };

    const updatedComponent = cloneDeep(componentSchema);
    updatedComponent.schema.attributes.push(newCustomFieldAttribute);

    const expected = {
      ...initialState,
      modifiedData: {
        components: {},
        component: updatedComponent,
      },
    };

    expect(reducer(state, action)).toEqual(expected);
  });

  it('adds a custom field to a component that is an attribute of a content type', () => {
    const componentSchema = {
      uid: 'basic.simple',
      category: 'basic',
      schema: {
        icon: 'ambulance',
        name: 'simple',
        description: '',
        connection: 'basic',
        collectionName: 'components_basic_simples',
        attributes: [
          { type: 'string', required: true, name: 'name' },
          { type: 'string', name: 'test' },
        ],
      },
    };

    const contentType = {
      uid: 'api::test.test',
      schema: {
        name: 'test',
        description: '',
        connection: 'default',
        collectionName: '',
        attributes: [
          { name: 'test', type: 'string' },
          { name: 'testcompo', type: 'component', component: 'basic.simple' },
        ],
      },
    };

    const state = {
      ...initialState,
      components: {
        'basic.simple': componentSchema,
      },
      modifiedData: {
        components: {
          'basic.simple': componentSchema,
        },
        contentType,
      },
    };

    const newCustomFieldAttribute = {
      // The underlying data type should be in the action and expected
      // The type is converted to customField on the server,
      type: 'string',
      name: 'color',
      options: { format: 'hex' },
      customField: 'plugin::mycustomfields.color',
    };

    const action = {
      type: ADD_CUSTOM_FIELD_ATTRIBUTE,
      attributeToSet: newCustomFieldAttribute,
      forTarget: 'components',
      targetUid: 'basic.simple',
      initialAttribute: {},
    };

    const updatedComponent = cloneDeep(componentSchema);
    updatedComponent.schema.attributes.push(newCustomFieldAttribute);

    const expected = {
      ...initialState,
      components: {
        'basic.simple': componentSchema,
      },
      modifiedData: {
        components: {
          'basic.simple': updatedComponent,
        },
        contentType,
      },
    };

    expect(reducer(state, action)).toEqual(expected);
  });
});
