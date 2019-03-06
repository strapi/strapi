
import {
  buildModelAttributes,
  getData,
  getDataSucceeded,
} from '../actions';
import {
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
        { icon: 'fa-cube', name: 'permission', description: '', fields: 6, source: 'users-permissions' },
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
      const expected = {
        type: GET_DATA_SUCCEEDED,
        models,
        initialData,
      };

      expect(getDataSucceeded({ models, allModels })).toEqual(expected);
    });
  });
});
