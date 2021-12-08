import testData from './data';
import removePasswordAndRelationsFieldFromData from '../removePasswordAndRelationsFieldFromData';

describe('I18n | Components | CMEditViewCopyLocale | utils', () => {
  describe('removePasswordAndRelationsFieldFromData', () => {
    it('should return an empty object', () => {
      const { components, contentType } = testData;

      expect(removePasswordAndRelationsFieldFromData({}, contentType, components)).toEqual({});
    });

    it('should return the initial data if there is no password field', () => {
      const { components, contentType } = testData;

      expect(
        removePasswordAndRelationsFieldFromData({ name: 'test' }, contentType, components)
      ).toEqual({
        name: 'test',
      });
    });

    it('should remove the password field for a simple data structure', () => {
      const { components, contentType } = testData;
      const data = { name: 'test', password: 'password' };
      const expected = { name: 'test' };

      expect(removePasswordAndRelationsFieldFromData(data, contentType, components)).toEqual(
        expected
      );
    });

    it('should remove all password fields', () => {
      const { components, contentType, modifiedData, expectedModifiedData } = testData;

      expect(
        removePasswordAndRelationsFieldFromData(modifiedData, contentType, components)
      ).toEqual(expectedModifiedData);
    });
  });
});
