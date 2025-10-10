import { createServiceUtils } from '../utils';

const baseStrapiMock = {
  plugin: jest.fn(() => {}),
};

describe('History utils', () => {
  describe('getSchemaAttributesDiff', () => {
    const { getSchemaAttributesDiff } = createServiceUtils({
      // @ts-expect-error ignore
      strapi: baseStrapiMock,
    });

    it('should return a diff', () => {
      const versionSchema = {
        title: {
          type: 'string',
        },
        someOtherField: {
          type: 'string',
        },
      };
      const contentTypeSchema = {
        renamed: {
          type: 'string',
        },
        newField: {
          type: 'string',
        },
        someOtherField: {
          type: 'string',
        },
      };

      // @ts-expect-error ignore
      const { added, removed } = getSchemaAttributesDiff(versionSchema, contentTypeSchema);

      expect(added).toEqual({
        renamed: {
          type: 'string',
        },
        newField: {
          type: 'string',
        },
      });
      expect(removed).toEqual({
        title: {
          type: 'string',
        },
      });
    });

    it('should not return a diff', () => {
      const versionSchema = {
        title: {
          type: 'string',
        },
      };
      const contentTypeSchema = {
        title: {
          type: 'string',
        },
      };

      // @ts-expect-error ignore
      const { added, removed } = getSchemaAttributesDiff(versionSchema, contentTypeSchema);

      expect(added).toEqual({});
      expect(removed).toEqual({});
    });
  });
});
