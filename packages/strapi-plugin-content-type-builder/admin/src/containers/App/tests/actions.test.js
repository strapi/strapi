import { fromJS, OrderedMap } from 'immutable';
import {
  addAttributeRelation,
  buildModelAttributes,
  deleteModel,
  deleteModelSucceeded,
  getData,
  getDataSucceeded,
  addAttributeToTempContentType,
  clearTemporaryAttribute,
  clearTemporaryAttributeRelation,
  cancelNewContentType,
  createTempContentType,
  deleteTemporaryModel,
  onChangeExistingContentTypeMainInfos,
  onChangeNewContentTypeMainInfos,
  onChangeAttribute,
  onChangeRelation,
  onChangeRelationTarget,
  onChangeRelationNature,
  submitTempContentType,
  submitTempContentTypeSucceeded,
  saveEditedAttribute,
  saveEditedAttributeRelation,
  setTemporaryAttribute,
  setTemporaryAttributeRelation,
  resetNewContentTypeMainInfos,
  resetEditExistingContentType,
  resetExistingContentTypeMainInfos,
  resetEditTempContentType,
  resetProps,
  updateTempContentType,
  addAttributeToExistingContentType,
  deleteModelAttribute,
  submitContentType,
  submitContentTypeSucceeded,
  formatModelAttributes,
} from '../actions';
import {
  ADD_ATTRIBUTE_RELATION,
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CLEAR_TEMPORARY_ATTRIBUTE_RELATION,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL,
  DELETE_TEMPORARY_MODEL,
  DELETE_MODEL_SUCCEEDED,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_ATTRIBUTE,
  ON_CHANGE_RELATION,
  ON_CHANGE_RELATION_TARGET,
  ON_CHANGE_RELATION_NATURE,
  SUBMIT_TEMP_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  SAVE_EDITED_ATTRIBUTE,
  SAVE_EDITED_ATTRIBUTE_RELATION,
  SET_TEMPORARY_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE_RELATION,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_TEMP_CONTENT_TYPE,
  RESET_PROPS,
  UPDATE_TEMP_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
  DELETE_MODEL_ATTRIBUTE,
  SUBMIT_CONTENT_TYPE,
  SUBMIT_CONTENT_TYPE_SUCCEEDED,
} from '../constants';

describe('Content Type Builder Action utils', () => {
  describe('BuildModelAttributes', () => {
    it('should generate an object with an attributes object', () => {
      const attributes = [
        {
          name: 'type',
          params: { type: 'string', required: true, configurable: false },
        },
        {
          name: 'controller',
          params: { type: 'string', required: true, configurable: false },
        },
        {
          name: 'test',
          params: { type: 'enumeration', enum: ['test', 'test1'] },
        },
        {
          name: 'otherTest',
          params: {
            columnName: '',
            nature: 'oneWay',
            target: 'super',
            targetColumnName: '',
          },
        },
      ];
      const expected = {
        type: fromJS({
          type: 'string',
          required: true,
          configurable: false,
        }),
        controller: fromJS({
          type: 'string',
          required: true,
          configurable: false,
        }),
        test: fromJS({
          type: 'enumeration',
          enum: 'test\ntest1',
        }),
        otherTest: fromJS({
          columnName: '',
          nature: 'oneWay',
          key: '-',
          target: 'super',
          targetColumnName: '',
        }),
      };

      expect(buildModelAttributes(attributes)).toEqual(expected);
    });
  });

  describe('formatModelAttributes', () => {
    it('should generate an array of object', () => {
      const expected = [
        { name: 'action', params: { type: 'string', required: true, configurable: false } },
        { name: 'controller', params: { type: 'string', required: true, configurable: false } },
        { name: 'enabled', params: { type: 'boolean', required: true, configurable: false } },
        { name: 'policy', params: { type: 'boolean', configurable: false } },
        {
          name: 'role',
          params: {
            key: 'permissions',
            nature: 'manyToOne',
            pluginValue: 'users-permissions',
            plugin: true,
            configurable: false,
            target: 'role',
          },
        },
        {
          name: 'test',
          params: {
            dominant: true,
            key: 'permissions2',
            columnName: 'test2',
            nature: 'manyToMany',
            pluginValue: 'users-permissions',
            plugin: true,
            target: 'role2',
            targetColumnName: 'test',
          },
        },
        { name: 'type', params: { type: 'string', required: true, configurable: true } },
        {
          name: 'price',
          params: {
            type: 'integer',
            required: true,
            min: 2,
          },
        },
        {
          name: 'otherTest',
          params: { type: 'enumeration', enum: ['test', 'test1'] },
        },
      ];
      const data = {
        action: {
          type: 'string',
          required: true,
          configurable: false,
        },
        controller: {
          type: 'string',
          required: true,
          configurable: false,
        },
        enabled: {
          type: 'boolean',
          required: true,
          configurable: false,
        },
        policy: {
          type: 'boolean',
          configurable: false,
        },
        role: {
          configurable: false,
          dominant: false,
          key: 'permissions',
          columnName: '',
          nature: 'manyToOne',
          plugin: 'users-permissions',
          targetColumnName: '',
          target: 'role',
        },
        test: {
          dominant: true,
          key: 'permissions2',
          nature: 'manyToMany',
          plugin: 'users-permissions',
          targetColumnName: 'test',
          columnName: 'test2',
          target: 'role2',
        },
        type: {
          type: 'string',
          required: true,
          configurable: true,
        },
        price: {
          type: 'integer',
          required: true,
          max: null,
          min: 2,
        },
        otherTest: {
          type: 'enumeration',
          enum: 'test\ntest1',
        },
      };

      expect(formatModelAttributes(data)).toEqual(expected);
    });
  });
});

describe('App actions', () => {
  describe('AddAttributeRelation', () => {
    it('has a type ADD_ATTRIBUTE_RELATION and pass the correct data', () => {
      const isModelTemporary = true;
      const modelName = 'test';
      const expected = {
        type: ADD_ATTRIBUTE_RELATION,
        isModelTemporary,
        modelName,
      };

      expect(addAttributeRelation(isModelTemporary, modelName)).toEqual(expected);
    });
  });

  describe('AddAttributeToExistingContentType', () => {
    it('has a type ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE and returns the correct data', () => {
      const attributeType = 'string';
      const contentTypeName = 'test';
      const expected = {
        type: ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
        attributeType,
        contentTypeName,
      };

      expect(addAttributeToExistingContentType(contentTypeName, attributeType)).toEqual(expected);
    });
  });

  describe('AddAttributeToTempContentType', () => {
    it('has a type ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE and returns the correct data', () => {
      const expected = {
        type: ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
        attributeType: 'test',
      };

      expect(addAttributeToTempContentType('test')).toEqual(expected);
    });
  });

  describe('CancelNewContentType', () => {
    it('has a type CANCEL_NEW_CONTENT_TYPE and returns the correct data', () => {
      const expected = {
        type: CANCEL_NEW_CONTENT_TYPE,
      };

      expect(cancelNewContentType()).toEqual(expected);
    });
  });

  describe('clearTemporaryAttributeRelation', () => {
    it('has a type CLEAR_TEMPORARY_ATTRIBUTE and returns the correct data', () => {
      const expected = {
        type: CLEAR_TEMPORARY_ATTRIBUTE_RELATION,
      };

      expect(clearTemporaryAttributeRelation()).toEqual(expected);
    });
  });

  describe('clearTemporaryAttribute', () => {
    it('has a type CLEAR_TEMPORARY_ATTRIBUTE and returns the correct data', () => {
      const expected = {
        type: CLEAR_TEMPORARY_ATTRIBUTE,
      };

      expect(clearTemporaryAttribute()).toEqual(expected);
    });
  });

  describe('CreateTempContentType', () => {
    it('has a type CREATE_TEMP_CONTENT_TYPE and returns the correct data', () => {
      const expected = {
        type: CREATE_TEMP_CONTENT_TYPE,
      };

      expect(createTempContentType()).toEqual(expected);
    });
  });

  describe('DeleteModel', () => {
    it('has a type DELETE_MODEL and returns the correct data', () => {
      const expected = {
        type: DELETE_MODEL,
        modelName: 'test',
      };

      expect(deleteModel('test')).toEqual(expected);
    });
  });

  describe('DeleteModelAttribute', () => {
    it('has a type DELETE_MODEL_ATTRIBUTE and returns the correct data', () => {
      const keys = ['modifiedData', 'product', 'name'];
      const expected = {
        type: DELETE_MODEL_ATTRIBUTE,
        keys,
      };

      expect(deleteModelAttribute(keys)).toEqual(expected);
    });
  });

  describe('DeleteModelSucceeded', () => {
    it('has a type DELETE_MODEL_SUCCEEDED and returns the correct data', () => {
      const expected = {
        type: DELETE_MODEL_SUCCEEDED,
        modelName: 'test',
      };

      expect(deleteModelSucceeded('test')).toEqual(expected);
    });
  });

  describe('DeleteTemporaryModel', () => {
    it('has a type DELETE_TEMPORARY_MODEL and returns the correct data', () => {
      const expected = {
        type: DELETE_TEMPORARY_MODEL,
      };

      expect(deleteTemporaryModel()).toEqual(expected);
    });
  });

  describe('GetData', () => {
    it('has a type of GET_DATA', () => {
      const expected = {
        type: GET_DATA,
      };

      expect(getData()).toEqual(expected);
    });
  });

  describe('GetDataSucceeded', () => {
    it('has a type of GET_DATA_SUCCEEDED and returns the correct data', () => {
      const models = [
        {
          icon: 'fa-cube',
          name: 'permission',
          description: '',
          fields: 6,
          source: 'users-permissions',
          isTemporary: false,
        },
      ];
      const allModels = [
        {
          collectionName: 'users-permissions_permission',
          connection: 'default',
          description: '',
          mainField: '',
          name: 'permission',
          attributes: [
            {
              name: 'type',
              params: { type: 'string', required: true, configurable: false },
            },
            {
              name: 'controller',
              params: { type: 'string', required: true, configurable: false },
            },
          ],
        },
      ];
      const initialData = {
        permission: {
          collectionName: 'users-permissions_permission',
          connection: 'default',
          description: '',
          mainField: '',
          name: 'permission',
          attributes: OrderedMap(
            fromJS({
              type: {
                type: 'string',
                required: true,
                configurable: false,
              },
              controller: {
                type: 'string',
                required: true,
                configurable: false,
              },
            }),
          ),
        },
      };
      const connections = ['default'];
      const expected = {
        type: GET_DATA_SUCCEEDED,
        models,
        initialData,
        connections,
      };

      expect(getDataSucceeded({ models, allModels }, connections)).toEqual(expected);
    });
  });

  describe('onChangeExistingContentTypeMainInfos', () => {
    it('has a type of ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS and returns the correct data tolowercase if the name is equal to name', () => {
      const e = {
        target: {
          name: 'name',
          value: 'testWith spaces and stuff ',
        },
      };
      const expected = {
        type: ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
        keys: ['name'],
        value: 'testwithspacesandstuff',
      };

      expect(onChangeExistingContentTypeMainInfos(e)).toEqual(expected);
    });

    it('should not return the data tolowercase if the name is not equal to name', () => {
      const e = {
        target: {
          name: 'test',
          value: 'testWith spaces and stuff',
        },
      };
      const expected = {
        type: ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
        keys: ['test'],
        value: 'testWith spaces and stuff',
      };

      expect(onChangeExistingContentTypeMainInfos(e)).toEqual(expected);
    });
  });

  describe('OnChangeNewContentTypeMainInfos', () => {
    it('has a type of ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS and returns the correct data tolowercase if the name is equal to name', () => {
      const e = {
        target: {
          name: 'name',
          value: 'testWith spaces and stuff ',
        },
      };
      const expected = {
        type: ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
        keys: ['name'],
        value: 'testwithspacesandstuff',
      };

      expect(onChangeNewContentTypeMainInfos(e)).toEqual(expected);
    });

    it('should not return the data tolowercase if the name is not equal to name', () => {
      const e = {
        target: {
          name: 'test',
          value: 'testWith spaces and stuff',
        },
      };
      const expected = {
        type: ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
        keys: ['test'],
        value: 'testWith spaces and stuff',
      };

      expect(onChangeNewContentTypeMainInfos(e)).toEqual(expected);
    });
  });

  describe('onChangeAttribute', () => {
    it('has a type ON_CHANGE_ATTRIBUTE and returns the correct data', () => {
      const e = {
        target: {
          name: 'test',
          value: 'test ',
        },
      };
      const expected = {
        type: ON_CHANGE_ATTRIBUTE,
        keys: ['test'],
        value: 'test ',
      };

      expect(onChangeAttribute(e)).toEqual(expected);
    });

    it('should remove the spaces if the user is modifying the name input', () => {
      const e = {
        target: {
          name: 'name',
          value: 'attribute with space',
        },
      };
      const expected = {
        type: ON_CHANGE_ATTRIBUTE,
        keys: ['name'],
        value: 'attributewithspace',
      };

      expect(onChangeAttribute(e)).toEqual(expected);
    });
  });

  describe('OnChangeRelation', () => {
    it('has a type ON_CHANGE_RELATION and returns the correct data', () => {
      const target = { name: 'test', value: 'super test ' };
      const expected = {
        type: ON_CHANGE_RELATION,
        keys: ['test'],
        value: 'supertest',
      };

      expect(onChangeRelation({ target })).toEqual(expected);
    });
  });

  describe('OnChangeRelationNature', () => {
    it('has a type ON_CHANGE_RELATION_NATURE and pass the correct data', () => {
      const nature = 'test';
      const currentModel = 'test';
      const expected = {
        type: ON_CHANGE_RELATION_NATURE,
        nature,
        currentModel,
      };

      expect(onChangeRelationNature(nature, currentModel)).toEqual(expected);
    });
  });

  describe('OnChangeRelationTarget', () => {
    it('has a TYPE ON_CHANGE_RELATION_TARGET and pass the correct data', () => {
      const model = 'test';
      const currentModel = 'test1';
      const expected = {
        type: ON_CHANGE_RELATION_TARGET,
        currentModel,
        model,
        isEditing: false,
      };

      expect(onChangeRelationTarget(model, currentModel)).toEqual(expected);
    });
  });

  describe('SaveEditedAttribute', () => {
    it('has a type of SAVE_EDITED_ATTRIBUTE and returns the correct data', () => {
      const attributeName = 'test';
      const isModelTemporary = true;
      const modelName = 'test';
      const expected = {
        type: SAVE_EDITED_ATTRIBUTE,
        attributeName,
        isModelTemporary,
        modelName,
      };

      expect(saveEditedAttribute(attributeName, isModelTemporary, modelName)).toEqual(expected);
    });
  });

  describe('SetTemporaryAttribute', () => {
    it('has a type of SET_TEMPORARY_ATTRIBUTE and returns the correct data', () => {
      const attributeName = 'test';
      const isModelTemporary = true;
      const modelName = 'test';
      const expected = {
        type: SET_TEMPORARY_ATTRIBUTE,
        attributeName,
        isModelTemporary,
        modelName,
      };

      expect(setTemporaryAttribute(attributeName, isModelTemporary, modelName)).toEqual(expected);
    });
  });

  describe('ResetNewContentTypeMainInfos', () => {
    it('has a TYPE RESET_NEW_CONTENT_TYPE_MAIN_INFOS', () => {
      const expected = {
        type: RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
      };

      expect(resetNewContentTypeMainInfos()).toEqual(expected);
    });
  });

  describe('ResetEditExistingContentType', () => {
    it('has a type RESET_EDIT_EXISTING_CONTENT_TYPE and returns the correct data', () => {
      const contentTypeName = 'test';
      const expected = {
        type: RESET_EDIT_EXISTING_CONTENT_TYPE,
        contentTypeName,
      };

      expect(resetEditExistingContentType(contentTypeName)).toEqual(expected);
    });
  });

  describe('ResetExistingContentTypeMainInfos', () => {
    it('has a type RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS and returns the correct data', () => {
      const contentTypeName = 'test';
      const expected = {
        type: RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
        contentTypeName,
      };

      expect(resetExistingContentTypeMainInfos(contentTypeName)).toEqual(expected);
    });
  });

  describe('ResetEditTempContentType', () => {
    it('has a type RESET_EDIT_TEMP_CONTENT_TYPE', () => {
      const expected = {
        type: RESET_EDIT_TEMP_CONTENT_TYPE,
      };

      expect(resetEditTempContentType()).toEqual(expected);
    });
  });

  describe('ResetProps', () => {
    it('has a type RESET_PROPS', () => {
      const expected = {
        type: RESET_PROPS,
      };

      expect(resetProps()).toEqual(expected);
    });
  });

  describe('SaveEditedAttributeRelation', () => {
    it('should have a type SAVE_EDITED_ATTRIBUTE_RELATION and pass the correct data', () => {
      const attributeName = 'test';
      const isModelTemporary = false;
      const modelName = 'test';
      const expected = {
        type: SAVE_EDITED_ATTRIBUTE_RELATION,
        attributeName,
        isModelTemporary,
        modelName,
      };

      expect(saveEditedAttributeRelation(attributeName, isModelTemporary, modelName)).toEqual(expected);
    });
  });

  describe('SetTemporaryAttributeRelation', () => {
    it('should have a type SET_TEMPORARY_ATTRIBUTE_RELATION and pass the correct data', () => {
      const attributeName = 'test';
      const isModelTemporary = false;
      const source = 'test';
      const target = 'test';
      const expected = {
        type: SET_TEMPORARY_ATTRIBUTE_RELATION,
        attributeName,
        isEditing: false,
        isModelTemporary,
        source,
        target,
      };

      expect(setTemporaryAttributeRelation(target, isModelTemporary, source, attributeName, false)).toEqual(
        expected,
      );
    });
  });

  describe('SubmitContentType', () => {
    it('has a type SUBMIT_CONTENT_TYPE and returns the correct data', () => {
      const data = {
        attributes: {
          action: {
            type: 'string',
            required: true,
            configurable: false,
          },
          controller: {
            type: 'string',
            required: true,
            configurable: false,
          },
          enabled: {
            type: 'boolean',
            required: true,
            configurable: false,
          },
          policy: {
            type: 'boolean',
            configurable: false,
          },
          role: {
            configurable: false,
            key: 'permissions',
            nature: 'manyToOne',
            plugin: 'users-permissions',
            targetColumnName: '',
            target: 'role',
          },
          type: {
            type: 'string',
            required: true,
            configurable: false,
          },
        },
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
      };
      const expectedData = {
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
        attributes: [
          { name: 'action', params: { type: 'string', required: true, configurable: false } },
          { name: 'controller', params: { type: 'string', required: true, configurable: false } },
          { name: 'enabled', params: { type: 'boolean', required: true, configurable: false } },
          { name: 'policy', params: { type: 'boolean', configurable: false } },
          {
            name: 'role',
            params: {
              key: 'permissions',
              nature: 'manyToOne',
              pluginValue: 'users-permissions',
              plugin: true,
              configurable: false,
              target: 'role',
            },
          },
          { name: 'type', params: { type: 'string', required: true, configurable: false } },
        ],
      };
      const context = {};
      const expected = {
        type: SUBMIT_CONTENT_TYPE,
        oldContentTypeName: 'permission',
        body: expectedData,
        source: null,
        context,
      };

      expect(submitContentType('permission', data, context, null)).toEqual(expected);
    });
  });

  describe('SubmitContentTypeSucceeded', () => {
    it('should have a type SUBMIT_CONTENT_TYPE_SUCCEEDED and returns the correct data', () => {
      const expected = {
        type: SUBMIT_CONTENT_TYPE_SUCCEEDED,
      };

      expect(submitContentTypeSucceeded()).toEqual(expected);
    });
  });

  describe('SubmitTempContentType', () => {
    it('has a type SUBMIT_TEMP_CONTENT_TYPE and returns the correct data', () => {
      const data = {
        attributes: {
          action: {
            type: 'string',
            required: true,
            configurable: false,
          },
          controller: {
            type: 'string',
            required: true,
            configurable: false,
          },
          enabled: {
            type: 'boolean',
            required: true,
            configurable: false,
          },
          policy: {
            type: 'boolean',
            configurable: false,
          },
          role: {
            configurable: false,
            key: 'permissions',
            nature: 'manyToOne',
            plugin: 'users-permissions',
            targetColumnName: '',
            target: 'role',
          },
          type: {
            type: 'string',
            required: true,
            configurable: false,
          },
        },
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
      };
      const expectedData = {
        collectionName: 'users-permissions_permission',
        connection: 'default',
        description: '',
        mainField: '',
        name: 'permission',
        attributes: [
          { name: 'action', params: { type: 'string', required: true, configurable: false } },
          { name: 'controller', params: { type: 'string', required: true, configurable: false } },
          { name: 'enabled', params: { type: 'boolean', required: true, configurable: false } },
          { name: 'policy', params: { type: 'boolean', configurable: false } },
          {
            name: 'role',
            params: {
              key: 'permissions',
              nature: 'manyToOne',
              pluginValue: 'users-permissions',
              plugin: true,
              configurable: false,
              target: 'role',
            },
          },
          { name: 'type', params: { type: 'string', required: true, configurable: false } },
        ],
      };
      const context = {};
      const expected = {
        type: SUBMIT_TEMP_CONTENT_TYPE,
        body: expectedData,
        context,
      };

      expect(submitTempContentType(data, context)).toEqual(expected);
    });
  });

  describe('SubmitTempContentTypeSucceeded', () => {
    it('has a type SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED and returns the correct data', () => {
      const expected = {
        type: SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
      };

      expect(submitTempContentTypeSucceeded()).toEqual(expected);
    });
  });

  describe('UpdateTempContentType', () => {
    it('has a type UPDATE_TEMP_CONTENT_TYPE', () => {
      const expected = {
        type: UPDATE_TEMP_CONTENT_TYPE,
      };

      expect(updateTempContentType()).toEqual(expected);
    });
  });
});
