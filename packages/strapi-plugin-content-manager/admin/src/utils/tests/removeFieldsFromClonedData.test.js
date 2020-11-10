import { testData } from '../../testUtils';
import removeFieldsFromClonedData from '../removeFieldsFromClonedData';

describe('CONTENT MANAGER | containers | EditViewDataManager | utils', () => {
  describe('removeFieldsFromClonedData', () => {
    it('should return an empty object', () => {
      const { components, contentType } = testData;

      expect(removeFieldsFromClonedData({}, contentType, components)).toEqual({});
    });

    it('should return the initial data if there is no field with the specified key', () => {
      const { components, contentType } = testData;

      expect(
        removeFieldsFromClonedData({ name: 'test' }, contentType, components, ['_id'])
      ).toEqual({
        name: 'test',
      });
    });

    it('should remove the specified field for a simple data structure', () => {
      const { components, contentType } = testData;
      const data = { _id: 'test', name: 'test' };
      const expected = { name: 'test' };

      expect(removeFieldsFromClonedData(data, contentType, components, ['_id'])).toEqual(expected);
    });

    it('should remove all the default fields', () => {
      const { components, contentType, modifiedData, expectedNoFieldsModifiedData } = testData;
      const fields = ['id', 'created_at', 'updated_at'];

      expect(removeFieldsFromClonedData(modifiedData, contentType, components, fields)).toEqual(
        expectedNoFieldsModifiedData
      );
    });
  });
});
