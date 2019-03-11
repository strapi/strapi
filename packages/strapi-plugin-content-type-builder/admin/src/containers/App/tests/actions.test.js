
import {
  buildModelAttributes,
  deleteModel,
  deleteModelSucceeded,
  getData,
  getDataSucceeded,
} from '../actions';
import {
  DELETE_MODEL,
  DELETE_MODEL_SUCCEEDED,
  GET_DATA,
  GET_DATA_SUCCEEDED,
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
        { icon: 'fa-cube', name: 'permission', description: '', fields: 6, source: 'users-permissions', isTemporary: false },
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
});
