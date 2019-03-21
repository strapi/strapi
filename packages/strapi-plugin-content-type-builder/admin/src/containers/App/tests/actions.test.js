import {
  buildModelAttributes,
  deleteModel,
  deleteModelSucceeded,
  getData,
  getDataSucceeded,
  addAttributeToTempContentType,
  clearTemporaryAttribute,
  cancelNewContentType,
  createTempContentType,
  deleteTemporaryModel,
  onChangeExistingContentTypeMainInfos,
  onChangeNewContentTypeMainInfos,
  onChangeAttribute,
  // submitTempContentType,
  submitTempContentTypeSucceeded,
  saveEditedAttribute,
  setTemporaryAttribute,
  resetNewContentTypeMainInfos,
  resetEditExistingContentType,
  resetExistingContentTypeMainInfos,
  resetEditTempContentType,
  resetProps,
  updateTempContentType,
  addAttributeToExistingContentType,
  deleteModelAttribute,
} from '../actions';
import {
  ADD_ATTRIBUTE_TO_TEMP_CONTENT_TYPE,
  CANCEL_NEW_CONTENT_TYPE,
  CLEAR_TEMPORARY_ATTRIBUTE,
  CREATE_TEMP_CONTENT_TYPE,
  DELETE_MODEL,
  DELETE_TEMPORARY_MODEL,
  DELETE_MODEL_SUCCEEDED,
  GET_DATA,
  GET_DATA_SUCCEEDED,
  ON_CHANGE_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CHANGE_ATTRIBUTE,
  // SUBMIT_TEMP_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
  SAVE_EDITED_ATTRIBUTE,
  SET_TEMPORARY_ATTRIBUTE,
  RESET_EDIT_EXISTING_CONTENT_TYPE,
  RESET_NEW_CONTENT_TYPE_MAIN_INFOS,
  RESET_EXISTING_CONTENT_TYPE_MAIN_INFOS,
  RESET_EDIT_TEMP_CONTENT_TYPE,
  RESET_PROPS,
  UPDATE_TEMP_CONTENT_TYPE,
  ADD_ATTRIBUTE_TO_EXISITING_CONTENT_TYPE,
  DELETE_MODEL_ATTRIBUTE,
} from '../constants';

describe('Content Type Builder Action utils', () => {
  describe('BuildModelAttributes', () => {
    it('should generate an object with an array of attributes', () => {
      const attributes = [
        {
          name: 'type',
          params: { type: 'string', required: true, configurable: false },
        },
        {
          name: 'controller',
          params: { type: 'string', required: true, configurable: false },
        },
      ];
      const expected = {
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
      };

      expect(buildModelAttributes(attributes)).toEqual(expected);
    });
  });
});

describe('App actions', () => {
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
          attributes: {
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
          },
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
          value: 'testWith spaces and stuff ',
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
          value: 'testWith spaces and stuff ',
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
          value: 'test',
        },
      };
      const expected = {
        type: ON_CHANGE_ATTRIBUTE,
        keys: ['test'],
        value: 'test',
      };

      expect(onChangeAttribute(e)).toEqual(expected);
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

  // describe('SubmitTempContentType', () => {
  //   it('has a type SUBMIT_TEMP_CONTENT_TYPE and returns the correct data', () => {
  //     const expected = {
  //       type: SUBMIT_TEMP_CONTENT_TYPE,
  //     };

  //     expect(submitTempContentType()).toEqual(expected);
  //   });
  // });

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
