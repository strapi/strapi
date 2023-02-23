import formatContentTypesPermissionToAPI, {
  createPropertyArray,
} from '../formatContentTypesPermissionToAPI';

describe('ADMIN | COMPONENTS | Roles | Permissions | utils', () => {
  describe('createPropertyArray', () => {
    it('should return an array of property values', () => {
      const propertyValues = {
        f1: true,
        f2: false,
        f3: true,
      };

      expect(createPropertyArray(propertyValues)).toEqual(['f1', 'f3']);
    });

    it('should return array of property values when the object has nesting', () => {
      const propertyValues = {
        f1: true,
        f2: {
          f21: true,
          f22: false,
          f23: {
            f231: true,
            f232: false,
          },
        },
        f3: {
          f31: {
            f311: false,
          },
          f32: false,
        },
      };
      const expected = ['f1', 'f2.f21', 'f2.f23.f231'];

      expect(createPropertyArray(propertyValues)).toEqual(expected);
    });
  });

  describe('formatContentTypesPermissionToAPI', () => {
    it('should return an empty array', () => {
      expect(formatContentTypesPermissionToAPI({})).toEqual([]);
    });

    it('should return an array of permissions with empty properties when the action is not a parent', () => {
      const permissions = {
        address: {
          create: {
            properties: {
              enabled: true,
            },
            conditions: { creator: false, role: true },
          },
          read: {
            properties: {
              enabled: false,
            },
            conditions: { creator: false, role: false },
          },
        },
        restaurant: {
          create: {
            properties: {
              enabled: false,
            },
            conditions: { creator: false, role: false },
          },
          read: {
            properties: {
              enabled: true,
            },
            conditions: { creator: true, role: false },
          },
        },
      };

      const expected = [
        {
          action: 'create',
          subject: 'address',
          conditions: ['role'],
          properties: {},
        },
        {
          action: 'read',
          subject: 'restaurant',
          conditions: ['creator'],
          properties: {},
        },
      ];

      expect(formatContentTypesPermissionToAPI(permissions)).toEqual(expected);
    });

    it('should return an array of permissions with properties when the action depends on properties', () => {
      const permissions = {
        address: {
          create: {
            properties: {
              fields: {
                f1: true,
                f2: false,
                f3: true,
              },
            },
            conditions: { creator: false, role: true },
          },
          read: {
            enabled: false,
            conditions: { creator: false, role: false },
          },
        },
        restaurant: {
          create: {
            properties: {
              enabled: false,
            },
            conditions: { creator: false, role: false },
          },
          read: {
            properties: {
              fields: {
                ff1: false,
                ff2: false,
              },
              locales: {
                en: true,
                fr: false,
              },
            },
            conditions: { creator: true, role: false },
          },
        },
      };

      const expected = [
        {
          action: 'create',
          subject: 'address',
          properties: {
            fields: ['f1', 'f3'],
          },
          conditions: ['role'],
        },
        {
          action: 'read',
          subject: 'restaurant',
          properties: {
            fields: [],
            locales: ['en'],
          },
          conditions: ['creator'],
        },
      ];

      expect(formatContentTypesPermissionToAPI(permissions)).toEqual(expected);
    });
  });
});
