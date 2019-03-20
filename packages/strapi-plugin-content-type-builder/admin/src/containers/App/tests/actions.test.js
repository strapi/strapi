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
  onChangeNewContentTypeMainInfos,
  onCreateAttribute,
  submitTempContentType,
  submitTempContentTypeSucceeded,
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
  ON_CHANGE_NEW_CONTENT_TYPE_MAIN_INFOS,
  ON_CREATE_ATTRIBUTE,
  SUBMIT_TEMP_CONTENT_TYPE,
  SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
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

  describe('createTempContentType', () => {
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

  describe('onChangeNewContentTypeMainInfos', () => {
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

  describe('onCreateAttribute', () => {
    it('has a type ON_CREATE_ATTRIBUTE and returns the correct data', () => {
      const e = {
        target: {
          name: 'test',
          value: 'test',
        },
      };
      const expected = {
        type: ON_CREATE_ATTRIBUTE,
        keys: ['test'],
        value: 'test',
      };

      expect(onCreateAttribute(e)).toEqual(expected);
    });
  });

  describe('submitTempContentType', () => {
    it('has a type SUBMIT_TEMP_CONTENT_TYPE and returns the correct data', () => {
      const expected = {
        type: SUBMIT_TEMP_CONTENT_TYPE,
      };

      expect(submitTempContentType()).toEqual(expected);
    });
  });

  describe('submitTempContentTypeSucceeded', () => {
    it('has a type SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED and returns the correct data', () => {
      const expected = {
        type: SUBMIT_TEMP_CONTENT_TYPE_SUCCEEDED,
      };

      expect(submitTempContentTypeSucceeded()).toEqual(expected);
    });
  });
});
