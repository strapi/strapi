import type { Struct } from '@strapi/types';
import { errors } from '@strapi/utils';
import {
  editContentType,
  formatContentType,
  getContentTypeOrigin,
  isContentTypeEditable,
} from '../content-types';

describe('Content types service', () => {
  describe('format ContentType', () => {
    const contentType = {
      uid: 'test-uid',
      kind: 'singleType',
      plugin: 'some-plugin',
      modelName: 'my-name',
      collectionName: 'tests',
      info: {
        displayName: 'My name',
        singularName: 'my-name',
        pluralName: 'my-names',
        description: 'My description',
      },
      options: {},
      pluginOptions: {
        'content-manager': {
          visible: true,
        },
      },
      attributes: {
        title: {
          type: 'string',
        },
      },
    } as unknown as Struct.ContentTypeSchema;

    it('Returns consistent schemas', () => {
      expect(formatContentType(contentType)).toMatchSnapshot();
    });

    it('marks file-based content types as editable', () => {
      expect(formatContentType(contentType).schema.editable).toBe(true);
    });

    it('marks programmatic content types as not editable', () => {
      const programmatic = {
        ...contentType,
        pluginOptions: { 'content-type-builder': { origin: 'programmatic' } },
      } as unknown as Struct.ContentTypeSchema;

      expect(formatContentType(programmatic).schema.editable).toBe(false);
    });
  });

  describe('content type origin', () => {
    const make = (origin?: string) =>
      ({
        pluginOptions: origin ? { 'content-type-builder': { origin } } : {},
      }) as unknown as Struct.ContentTypeSchema;

    it('reads the programmatic origin tag', () => {
      expect(getContentTypeOrigin(make('programmatic'))).toBe('programmatic');
      expect(getContentTypeOrigin(make())).toBeUndefined();
    });

    it('treats only programmatic content types as read-only', () => {
      expect(isContentTypeEditable(make('programmatic'))).toBe(false);
      expect(isContentTypeEditable(make())).toBe(true);
    });
  });

  describe('editContentType', () => {
    beforeEach(() => {
      global.strapi = {
        components: {},
        contentTypes: {},
        dirs: { app: { api: '/app/src/api', components: '/app/src/components' } },
      } as any;
    });

    it('Throws a not found error when the uid is unknown', async () => {
      const promise = editContentType('api::unknown.unknown', {
        contentType: { attributes: {} },
      });

      await expect(promise).rejects.toThrow(errors.ApplicationError);
      await expect(promise).rejects.toThrow('contentType.notFound');
    });
  });
});
