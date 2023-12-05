import { testData } from '../../tests/data';
import { createDefaultDataStructure, removePasswordFieldsFromData } from '../data';

describe('data', () => {
  describe('createDefaultDataStructure', () => {
    it('should return an empty object if there is no default value', () => {
      const attributes = {
        test: {
          type: 'text',
        },
      };

      // @ts-expect-error – TODO: fix types for test
      expect(createDefaultDataStructure(attributes, {})).toEqual({});
    });

    it('should init the requide dynamic zone type with an empty array', () => {
      // @ts-expect-error – TODO: fix types for test
      expect(createDefaultDataStructure({ test: { type: 'dynamiczone', required: true } })).toEqual(
        {
          test: [],
        }
      );
    });

    it('should set the default values correctly', () => {
      const attributes = {
        text: {
          type: 'text',
          default: 'test',
        },
        email: {
          type: 'email',
          default: 'test@test.com',
        },
        date: {
          type: 'data',
        },
      };

      // @ts-expect-error – TODO: fix types for test
      expect(createDefaultDataStructure(attributes)).toEqual({
        text: 'test',
        email: 'test@test.com',
      });
    });

    it('should create the form correctly for the required component type', () => {
      const ctAttributes = {
        simple: {
          type: 'component',
          component: 'default.test',
          repeatable: false,
          required: true,
        },
        repeatable: {
          type: 'component',
          component: 'test.test',
          repeatable: true,
          required: true,
          min: 1,
        },
      };
      const components = {
        'default.test': {
          attributes: {
            text: {
              type: 'text',
            },
            email: {
              type: 'email',
            },
          },
        },
        'test.test': {
          attributes: {
            text: {
              type: 'text',
              default: 'test',
            },
            email: {
              type: 'email',
            },
          },
        },
      };

      const expected = {
        simple: {},
        repeatable: [
          {
            text: 'test',
          },
        ],
      };

      // @ts-expect-error – TODO: fix types for test
      expect(createDefaultDataStructure(ctAttributes, components)).toEqual(expected);
    });
  });

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
