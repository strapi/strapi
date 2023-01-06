import { testData } from '../../testUtils';
import removePasswordFieldsFromData from '../removePasswordFieldsFromData';

describe('CONTENT MANAGER | utils', () => {
  describe('removePasswordFieldsFromData', () => {
    it('should return an empty object', () => {
      const { components, contentType } = testData;

      expect(removePasswordFieldsFromData({}, contentType, components)).toEqual({});
    });

    it('should return the initial data if there is no password field', () => {
      const { components, contentType } = testData;

      expect(removePasswordFieldsFromData({ name: 'test' }, contentType, components)).toEqual({
        name: 'test',
      });
    });

    it('should remove the password field for a simple data structure', () => {
      const { components, contentType } = testData;
      const data = { name: 'test', password: 'password' };
      const expected = { name: 'test' };

      expect(removePasswordFieldsFromData(data, contentType, components)).toEqual(expected);
    });

    it('should remove all password fields', () => {
      const { components, contentType, modifiedData, expectedModifiedData } = testData;

      expect(removePasswordFieldsFromData(modifiedData, contentType, components)).toEqual(
        expectedModifiedData
      );
    });
  });
});
