import { sortContentType, stateToRequestData } from '../cleanData';

import type {
  Components,
  ContentTypes,
  ContentType,
  AnyAttribute,
  Component,
} from '../../../../types';

describe('CleanData utils', () => {
  describe('sortContentType', () => {
    it('should return sorted collection types array', () => {
      const input: ContentTypes = {
        'api::category.category': {
          uid: 'api::category.category',
          globalId: 'category',
          modelName: 'category',
          kind: 'collectionType',
          modelType: 'contentType',
          restrictRelationsTo: null,
          status: 'UNCHANGED',
          visible: true,
          info: {
            displayName: 'category',
            singularName: 'category',
            pluralName: 'category',
          },
          attributes: [],
        },
        'api::address.address': {
          uid: 'api::address.address',
          globalId: 'address',
          modelName: 'address',
          kind: 'collectionType',
          modelType: 'contentType',
          restrictRelationsTo: null,
          status: 'UNCHANGED',
          visible: true,
          info: {
            displayName: 'address',
            singularName: 'address',
            pluralName: 'address',
          },
          attributes: [],
        },
      };

      expect(sortContentType(input)).toMatchInlineSnapshot(`
        [
          {
            "kind": "collectionType",
            "name": "api::address.address",
            "plugin": undefined,
            "restrictRelationsTo": null,
            "status": "UNCHANGED",
            "title": "address",
            "to": "/plugins/content-type-builder/content-types/api::address.address",
            "uid": "api::address.address",
            "visible": true,
          },
          {
            "kind": "collectionType",
            "name": "api::category.category",
            "plugin": undefined,
            "restrictRelationsTo": null,
            "status": "UNCHANGED",
            "title": "category",
            "to": "/plugins/content-type-builder/content-types/api::category.category",
            "uid": "api::category.category",
            "visible": true,
          },
        ]
      `);
    });

    it('should return an empty array if no content types', () => {
      expect(sortContentType({})).toEqual([]);
    });
  });

  describe('stateToRequestData', () => {
    const createMockContentType = (
      overrides: Partial<ContentType> & { uid: ContentType['uid'] }
    ): ContentType => {
      const baseModelName = overrides.uid.split('.')[1] || 'mockmodel';
      const baseGlobalId = baseModelName.charAt(0).toUpperCase() + baseModelName.slice(1);

      const defaultInfo = {
        displayName: baseGlobalId,
        singularName: baseModelName,
        pluralName: `${baseModelName}s`,
        description: 'A mock content type',
      };

      const defaults: Omit<ContentType, 'uid' | 'info' | 'options' | 'attributes'> & {
        info: typeof defaultInfo;
        options: Partial<ContentType['options']>;
        attributes: AnyAttribute[];
      } = {
        status: 'UNCHANGED',
        kind: 'collectionType',
        modelType: 'contentType',
        modelName: baseModelName,
        globalId: baseGlobalId,
        visible: true,
        restrictRelationsTo: null,
        pluginOptions: {},
        info: defaultInfo,
        options: { draftAndPublish: false },
        attributes: [],
      };

      const finalInfo = { ...defaultInfo, ...overrides.info };
      const finalOptions = { ...defaults.options, ...overrides.options };
      const finalAttributes = overrides.attributes || defaults.attributes;

      return {
        ...defaults,
        ...overrides,
        info: finalInfo,
        options: finalOptions,
        attributes: finalAttributes,
      } as ContentType;
    };

    const createMockComponent = (
      overrides: Partial<Component> & { uid: Component['uid'] }
    ): Component => {
      const baseModelName = overrides.uid.split('.')[1] || 'mockcomp';
      const baseGlobalId = baseModelName.charAt(0).toUpperCase() + baseModelName.slice(1);

      const defaultInfo = {
        displayName: baseGlobalId,
        icon: 'cube',
      };

      const defaults: Omit<Component, 'uid' | 'info' | 'attributes'> & {
        info: typeof defaultInfo;
        attributes: AnyAttribute[];
      } = {
        status: 'UNCHANGED',
        category: 'mockCategory',
        modelType: 'component',
        modelName: baseModelName,
        globalId: baseGlobalId,
        info: defaultInfo,
        attributes: [],
      };

      const finalInfo = { ...defaultInfo, ...overrides.info };
      const finalAttributes = overrides.attributes || defaults.attributes;

      return {
        ...defaults,
        ...overrides,
        info: finalInfo,
        attributes: finalAttributes,
      } as Component;
    };

    it('should correctly update tracking properties', () => {
      const mockComponents: Components = {};
      const newContentType = createMockContentType({
        uid: 'api::mytest.mytest',
        status: 'NEW',
        attributes: [{ name: 'title', type: 'string', status: 'NEW' } as AnyAttribute],
      });

      const mockContentTypes: ContentTypes = {
        [newContentType.uid]: newContentType,
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(1);
      expect(trackingEventProperties.editedContentTypes).toBe(0);
      expect(trackingEventProperties.deletedContentTypes).toBe(0);
      expect(trackingEventProperties.newComponents).toBe(0);
      expect(trackingEventProperties.editedComponents).toBe(0);
      expect(trackingEventProperties.deletedComponents).toBe(0);
      expect(trackingEventProperties.newFields).toBe(1);
      expect(trackingEventProperties.editedFields).toBe(0);
      expect(trackingEventProperties.deletedFields).toBe(0);
    });

    it('should correctly count an edited content type and mixed field operations', () => {
      const mockComponents: Components = {};
      const mockContentTypes: ContentTypes = {
        'api::article.article': createMockContentType({
          uid: 'api::article.article',
          status: 'CHANGED',
          attributes: [
            { name: 'title', type: 'string', status: 'UNCHANGED' } as AnyAttribute,
            { name: 'new_field', type: 'text', status: 'NEW' } as AnyAttribute,
            { name: 'edited_field', type: 'richtext', status: 'CHANGED' } as AnyAttribute,
            { name: 'removed_field', type: 'date', status: 'REMOVED' } as AnyAttribute,
          ],
        }),
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(0);
      expect(trackingEventProperties.editedContentTypes).toBe(1);
      expect(trackingEventProperties.deletedContentTypes).toBe(0);

      expect(trackingEventProperties.newComponents).toBe(0);
      expect(trackingEventProperties.editedComponents).toBe(0);
      expect(trackingEventProperties.deletedComponents).toBe(0);

      expect(trackingEventProperties.newFields).toBe(1);
      expect(trackingEventProperties.editedFields).toBe(1);
      expect(trackingEventProperties.deletedFields).toBe(1);
    });

    it('should correctly count a deleted content type and its fields', () => {
      const mockComponents: Components = {};
      const mockContentTypes: ContentTypes = {
        'api::tobedeleted.tobedeleted': createMockContentType({
          uid: 'api::tobedeleted.tobedeleted',
          status: 'REMOVED',
          attributes: [
            { name: 'field1', type: 'string', status: 'UNCHANGED' } as AnyAttribute,
            { name: 'field2', type: 'text', status: 'UNCHANGED' } as AnyAttribute,
          ],
        }),
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(0);
      expect(trackingEventProperties.editedContentTypes).toBe(0);
      expect(trackingEventProperties.deletedContentTypes).toBe(1);

      expect(trackingEventProperties.newComponents).toBe(0);
      expect(trackingEventProperties.editedComponents).toBe(0);
      expect(trackingEventProperties.deletedComponents).toBe(0);

      expect(trackingEventProperties.newFields).toBe(0);
      expect(trackingEventProperties.editedFields).toBe(0);
      expect(trackingEventProperties.deletedFields).toBe(2);
    });

    it('should correctly count a new component and its fields', () => {
      const mockContentTypes: ContentTypes = {};
      const mockComponents: Components = {
        'basic.new-component': createMockComponent({
          uid: 'basic.new-component',
          status: 'NEW',
          category: 'basic',
          attributes: [
            { name: 'heading', type: 'string', status: 'NEW' } as AnyAttribute,
            { name: 'sub_heading', type: 'text', status: 'NEW' } as AnyAttribute,
          ],
        }),
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(0);
      expect(trackingEventProperties.editedContentTypes).toBe(0);
      expect(trackingEventProperties.deletedContentTypes).toBe(0);

      expect(trackingEventProperties.newComponents).toBe(1);
      expect(trackingEventProperties.editedComponents).toBe(0);
      expect(trackingEventProperties.deletedComponents).toBe(0);

      expect(trackingEventProperties.newFields).toBe(2);
      expect(trackingEventProperties.editedFields).toBe(0);
      expect(trackingEventProperties.deletedFields).toBe(0);
    });

    it('should correctly count an edited component and mixed field operations', () => {
      const mockContentTypes: ContentTypes = {};
      const mockComponents: Components = {
        'layout.hero-section': createMockComponent({
          uid: 'layout.hero-section',
          status: 'CHANGED',
          category: 'layout',
          attributes: [
            { name: 'title', type: 'string', status: 'UNCHANGED' } as AnyAttribute,
            {
              name: 'new_cta_button',
              type: 'component',
              component: 'shared.button',
              status: 'NEW',
            } as AnyAttribute,
            { name: 'description', type: 'richtext', status: 'CHANGED' } as AnyAttribute,
            { name: 'old_image', type: 'media', status: 'REMOVED' } as AnyAttribute,
          ],
        }),
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(0);
      expect(trackingEventProperties.editedContentTypes).toBe(0);
      expect(trackingEventProperties.deletedContentTypes).toBe(0);

      expect(trackingEventProperties.newComponents).toBe(0);
      expect(trackingEventProperties.editedComponents).toBe(1);
      expect(trackingEventProperties.deletedComponents).toBe(0);

      expect(trackingEventProperties.newFields).toBe(1);
      expect(trackingEventProperties.editedFields).toBe(1);
      expect(trackingEventProperties.deletedFields).toBe(1);
    });

    it('should correctly count a deleted component and its fields', () => {
      const mockContentTypes: ContentTypes = {};
      const mockComponents: Components = {
        'shared.old-component': createMockComponent({
          uid: 'shared.old-component',
          status: 'REMOVED',
          category: 'shared',
          attributes: [
            { name: 'property1', type: 'string', status: 'UNCHANGED' } as AnyAttribute,
            { name: 'property2', type: 'boolean', status: 'UNCHANGED' } as AnyAttribute,
            { name: 'property3', type: 'integer', status: 'UNCHANGED' } as AnyAttribute,
          ],
        }),
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(0);
      expect(trackingEventProperties.editedContentTypes).toBe(0);
      expect(trackingEventProperties.deletedContentTypes).toBe(0);

      expect(trackingEventProperties.newComponents).toBe(0);
      expect(trackingEventProperties.editedComponents).toBe(0);
      expect(trackingEventProperties.deletedComponents).toBe(1);

      expect(trackingEventProperties.newFields).toBe(0);
      expect(trackingEventProperties.editedFields).toBe(0);
      expect(trackingEventProperties.deletedFields).toBe(3);
    });

    it('should correctly count mixed operations: new CT, edited Component, and various field changes', () => {
      const mockContentTypes: ContentTypes = {
        'api::newblog.newblog': createMockContentType({
          uid: 'api::newblog.newblog',
          status: 'NEW',
          attributes: [{ name: 'blog_title', type: 'string', status: 'NEW' } as AnyAttribute],
        }),
      };

      const mockComponents: Components = {
        'ui.header': createMockComponent({
          uid: 'ui.header',
          status: 'CHANGED',
          category: 'ui',
          attributes: [
            { name: 'logo', type: 'media', status: 'UNCHANGED' } as AnyAttribute,
            { name: 'tagline', type: 'string', status: 'CHANGED' } as AnyAttribute,
            { name: 'navigation_links', type: 'json', status: 'NEW' } as AnyAttribute,
          ],
        }),
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(1);
      expect(trackingEventProperties.editedContentTypes).toBe(0);
      expect(trackingEventProperties.deletedContentTypes).toBe(0);

      expect(trackingEventProperties.newComponents).toBe(0);
      expect(trackingEventProperties.editedComponents).toBe(1);
      expect(trackingEventProperties.deletedComponents).toBe(0);

      expect(trackingEventProperties.newFields).toBe(2);
      expect(trackingEventProperties.editedFields).toBe(1);
      expect(trackingEventProperties.deletedFields).toBe(0);
    });

    it('should correctly count entities with UNCHANGED status (i.e., ignore them)', () => {
      const mockContentTypes: ContentTypes = {
        'api::product.product': createMockContentType({
          uid: 'api::product.product',
          status: 'UNCHANGED',
          attributes: [{ name: 'name', type: 'string', status: 'UNCHANGED' } as AnyAttribute],
        }),
      };
      const mockComponents: Components = {
        'shared.footer': createMockComponent({
          uid: 'shared.footer',
          status: 'UNCHANGED',
          attributes: [{ name: 'copyright', type: 'string', status: 'UNCHANGED' } as AnyAttribute],
        }),
      };

      const { trackingEventProperties } = stateToRequestData({
        components: mockComponents,
        contentTypes: mockContentTypes,
      });

      expect(trackingEventProperties.newContentTypes).toBe(0);
      expect(trackingEventProperties.editedContentTypes).toBe(0);
      expect(trackingEventProperties.deletedContentTypes).toBe(0);
      expect(trackingEventProperties.newComponents).toBe(0);
      expect(trackingEventProperties.editedComponents).toBe(0);
      expect(trackingEventProperties.deletedComponents).toBe(0);
      expect(trackingEventProperties.newFields).toBe(0);
      expect(trackingEventProperties.editedFields).toBe(0);
      expect(trackingEventProperties.deletedFields).toBe(0);
    });
  });
});
