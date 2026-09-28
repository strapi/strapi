import { createServiceUtils } from '../utils';

const baseStrapiMock = {
  plugin: jest.fn(() => {}),
};

describe('History utils', () => {
  describe('getVersionStatus', () => {
    it('does not populate available locales when resolving relation status', async () => {
      const getMetadata = jest.fn().mockResolvedValue({ availableStatus: [] });
      const getStatus = jest.fn().mockReturnValue('draft');
      const strapi = {
        plugin: jest.fn((name: string) =>
          name === 'content-manager'
            ? {
                service: () => ({ getMetadata, getStatus }),
              }
            : undefined
        ),
      };
      const { getVersionStatus } = createServiceUtils({
        // @ts-expect-error minimal service mock
        strapi,
      });
      const document = { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null };

      await getVersionStatus('api::article.article', document);

      expect(getMetadata).toHaveBeenCalledWith('api::article.article', document, {
        availableLocales: false,
      });
    });
  });

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
