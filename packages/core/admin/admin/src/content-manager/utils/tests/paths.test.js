import { getInitialDataPathUsingTempKeys } from '../paths';

describe('CONTENT MANAGER | utils | paths', () => {
  describe('getInitialDataPathUsingTempKeys', () => {
    test('correctly computes initial data path', async () => {
      const initialData = {
        dz: [
          {
            __component: 'default.blank',
            __temp_key__: 6,
          },
          {
            __component: 'default.withToManyComponentRelation',
            __temp_key__: 7,
            toManyRelation: [
              {
                id: 14,
                publishers: [],
                __temp_key__: 1,
              },
              {
                id: 13,
                publishers: [],
                __temp_key__: 0,
              },
            ],
          },
        ],
      };

      const modifiedData = {
        dz: [
          {
            __component: 'default.blank',
            __temp_key__: 6,
          },
          {
            __component: 'default.withToManyComponentRelation',
            __temp_key__: 7,
            toManyRelation: [
              {
                id: 13,
                publishers: [],
                __temp_key__: 0,
              },
              {
                id: 14,
                publishers: [],
                __temp_key__: 1,
              },
            ],
          },
        ],
      };

      const result = getInitialDataPathUsingTempKeys(
        initialData,
        modifiedData
      )('dz.1.toManyRelation.0.publishers');

      expect(result).toEqual(['dz', '1', 'toManyRelation', '1', 'publishers']);
    });
  });
});
