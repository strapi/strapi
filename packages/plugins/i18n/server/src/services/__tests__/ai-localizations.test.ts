import type { Schema, UID } from '@strapi/types';

import { mergeUnsupportedFields, buildDeepPopulate } from '../ai-localizations';

describe('ai-localizations service', () => {
  describe('mergeUnsupportedFields', () => {
    const mockGetModel = (uid: UID.Schema): Schema.Schema | undefined => {
      const models: Record<string, unknown> = {
        'components.media-section': {
          modelType: 'component',
          uid: 'components.media-section',
          modelName: 'media-section',
          globalId: 'ComponentsMediaSection',
          category: 'blog',
          info: { displayName: 'Media Section' },
          attributes: {
            sectionTitle: { type: 'string' },
            sectionDescription: { type: 'text' },
            sectionImage: { type: 'media', multiple: false },
            sectionBackground: { type: 'enumeration', enum: ['white', 'gray', 'blue'] },
            isFullWidth: { type: 'boolean' },
          },
        },
        'components.seo': {
          modelType: 'component',
          uid: 'components.seo',
          modelName: 'seo',
          globalId: 'ComponentsSeo',
          category: 'blog',
          info: { displayName: 'SEO' },
          attributes: {
            metaTitle: { type: 'string' },
            ogImage: { type: 'media', multiple: false },
          },
        },
      };
      return models[uid] as Schema.Schema | undefined;
    };

    describe('root-level unsupported fields', () => {
      const schemaAttributes = {
        title: { type: 'string' },
        content: { type: 'richtext' },
        featuredImage: { type: 'media', multiple: false },
        backgroundColor: { type: 'enumeration', enum: ['white', 'gray', 'blue'] },
        isFeatured: { type: 'boolean' },
        author: { type: 'relation', relation: 'oneToOne' },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      it('should preserve media fields from source document', () => {
        const targetData = {
          title: 'Translated Title',
          content: 'Translated content',
        };
        const sourceDoc = {
          title: 'Original Title',
          content: 'Original content',
          featuredImage: { id: 1, url: '/image.jpg' },
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaAttributes,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.content).toBe('Translated content');
        expect(result.featuredImage).toEqual({ id: 1, url: '/image.jpg' });
      });

      it('should preserve boolean fields from source document', () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          isFeatured: true,
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaAttributes,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.isFeatured).toBe(true);
      });

      it('should preserve enumeration fields from source document', () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          backgroundColor: 'blue',
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaAttributes,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.backgroundColor).toBe('blue');
      });

      it('should preserve relation fields from source document', () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          author: { id: 5, name: 'John Doe' },
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaAttributes,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.author).toEqual({ id: 5, name: 'John Doe' });
      });

      it('should preserve multiple unsupported fields at once', () => {
        const targetData = {
          title: 'Translated Title',
          content: 'Translated content',
        };
        const sourceDoc = {
          title: 'Original Title',
          content: 'Original content',
          featuredImage: { id: 1, url: '/image.jpg' },
          backgroundColor: 'blue',
          isFeatured: true,
          author: { id: 5 },
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaAttributes,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.content).toBe('Translated content');
        expect(result.featuredImage).toEqual({ id: 1, url: '/image.jpg' });
        expect(result.backgroundColor).toBe('blue');
        expect(result.isFeatured).toBe(true);
        expect(result.author).toEqual({ id: 5 });
      });

      it('should not overwrite existing unsupported fields in target', () => {
        const targetData = {
          title: 'Translated Title',
          isFeatured: false, // Already set in target
        };
        const sourceDoc = {
          title: 'Original Title',
          isFeatured: true,
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaAttributes,
          mockGetModel
        );

        expect(result.isFeatured).toBe(false); // Should keep target value
      });

      it('should handle null source document', () => {
        const targetData = {
          title: 'Translated Title',
        };

        const result = mergeUnsupportedFields(targetData, null, schemaAttributes, mockGetModel);

        expect(result).toEqual({ title: 'Translated Title' });
      });

      it('should ignore system fields', () => {
        const schemaWithSystemFields = {
          ...schemaAttributes,
          id: { type: 'integer' },
          documentId: { type: 'string' },
          createdAt: { type: 'datetime' },
        } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          id: 999,
          documentId: 'doc-123',
          createdAt: '2024-01-01',
          title: 'Original Title',
          isFeatured: true,
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithSystemFields,
          mockGetModel
        );

        expect(result.id).toBeUndefined();
        expect(result.documentId).toBeUndefined();
        expect(result.createdAt).toBeUndefined();
        expect(result.isFeatured).toBe(true);
      });
    });

    describe('nested component fields', () => {
      const schemaWithComponent = {
        title: { type: 'string' },
        seo: {
          type: 'component',
          component: 'components.seo',
          repeatable: false,
        },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      it('should preserve unsupported fields in single component', () => {
        const targetData = {
          title: 'Translated Title',
          seo: {
            metaTitle: 'Translated Meta',
          },
        };
        const sourceDoc = {
          title: 'Original Title',
          seo: {
            metaTitle: 'Original Meta',
            ogImage: { id: 1, url: '/og.jpg' },
          },
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithComponent,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.seo.metaTitle).toBe('Translated Meta');
        expect(result.seo.ogImage).toEqual({ id: 1, url: '/og.jpg' });
      });

      it('should preserve entire component if not in target', () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          seo: {
            metaTitle: 'Original Meta',
            ogImage: { id: 1, url: '/og.jpg' },
          },
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithComponent,
          mockGetModel
        );

        expect(result.seo).toEqual(sourceDoc.seo);
      });
    });

    describe('repeatable component fields', () => {
      const schemaWithRepeatable = {
        title: { type: 'string' },
        sections: {
          type: 'component',
          component: 'components.media-section',
          repeatable: true,
        },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      it('should preserve unsupported fields in repeatable components', () => {
        const targetData = {
          title: 'Translated Title',
          sections: [
            { sectionTitle: 'Translated Section 1', sectionDescription: 'Desc 1' },
            { sectionTitle: 'Translated Section 2', sectionDescription: 'Desc 2' },
          ],
        };
        const sourceDoc = {
          title: 'Original Title',
          sections: [
            {
              sectionTitle: 'Original Section 1',
              sectionDescription: 'Desc 1',
              sectionImage: { id: 1, url: '/img1.jpg' },
              sectionBackground: 'blue',
              isFullWidth: true,
            },
            {
              sectionTitle: 'Original Section 2',
              sectionDescription: 'Desc 2',
              sectionImage: { id: 2, url: '/img2.jpg' },
              sectionBackground: 'gray',
              isFullWidth: false,
            },
          ],
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithRepeatable,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.sections).toHaveLength(2);

        // First section
        expect(result.sections[0].sectionTitle).toBe('Translated Section 1');
        expect(result.sections[0].sectionImage).toEqual({ id: 1, url: '/img1.jpg' });
        expect(result.sections[0].sectionBackground).toBe('blue');
        expect(result.sections[0].isFullWidth).toBe(true);

        // Second section
        expect(result.sections[1].sectionTitle).toBe('Translated Section 2');
        expect(result.sections[1].sectionImage).toEqual({ id: 2, url: '/img2.jpg' });
        expect(result.sections[1].sectionBackground).toBe('gray');
        expect(result.sections[1].isFullWidth).toBe(false);
      });

      it('should preserve entire repeatable component array if not in target', () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          sections: [
            {
              sectionTitle: 'Section 1',
              sectionImage: { id: 1, url: '/img1.jpg' },
            },
          ],
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithRepeatable,
          mockGetModel
        );

        expect(result.sections).toEqual(sourceDoc.sections);
      });

      it('should handle mismatched array lengths gracefully', () => {
        const targetData = {
          title: 'Translated Title',
          sections: [
            { sectionTitle: 'Translated Section 1' },
            { sectionTitle: 'Translated Section 2' },
            { sectionTitle: 'Translated Section 3' }, // Extra item
          ],
        };
        const sourceDoc = {
          title: 'Original Title',
          sections: [
            { sectionTitle: 'Section 1', sectionImage: { id: 1 } },
            { sectionTitle: 'Section 2', sectionImage: { id: 2 } },
            // No third item in source
          ],
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithRepeatable,
          mockGetModel
        );

        expect(result.sections).toHaveLength(3);
        expect(result.sections[0].sectionImage).toEqual({ id: 1 });
        expect(result.sections[1].sectionImage).toEqual({ id: 2 });
        expect(result.sections[2].sectionTitle).toBe('Translated Section 3');
        expect(result.sections[2].sectionImage).toBeUndefined();
      });
    });

    describe('dynamic zone fields', () => {
      const schemaWithDynamicZone = {
        title: { type: 'string' },
        blocks: {
          type: 'dynamiczone',
          components: ['components.media-section', 'components.seo'],
        },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      it('should preserve unsupported fields in dynamic zone components', () => {
        const targetData = {
          title: 'Translated Title',
          blocks: [
            {
              __component: 'components.media-section',
              sectionTitle: 'Translated Section',
            },
            {
              __component: 'components.seo',
              metaTitle: 'Translated Meta',
            },
          ],
        };
        const sourceDoc = {
          title: 'Original Title',
          blocks: [
            {
              __component: 'components.media-section',
              sectionTitle: 'Original Section',
              sectionImage: { id: 1, url: '/img.jpg' },
              sectionBackground: 'blue',
            },
            {
              __component: 'components.seo',
              metaTitle: 'Original Meta',
              ogImage: { id: 2, url: '/og.jpg' },
            },
          ],
        };

        const result = mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithDynamicZone,
          mockGetModel
        );

        expect(result.title).toBe('Translated Title');
        expect(result.blocks[0].sectionTitle).toBe('Translated Section');
        expect(result.blocks[0].sectionImage).toEqual({ id: 1, url: '/img.jpg' });
        expect(result.blocks[0].sectionBackground).toBe('blue');
        expect(result.blocks[1].metaTitle).toBe('Translated Meta');
        expect(result.blocks[1].ogImage).toEqual({ id: 2, url: '/og.jpg' });
      });
    });
  });

  describe('buildDeepPopulate', () => {
    const mockGetModel = (uid: UID.Schema): Schema.Schema | undefined => {
      const models: Record<string, unknown> = {
        'components.media-section': {
          modelType: 'component',
          uid: 'components.media-section',
          modelName: 'media-section',
          globalId: 'ComponentsMediaSection',
          category: 'blog',
          info: { displayName: 'Media Section' },
          attributes: {
            sectionTitle: { type: 'string' },
            sectionImage: { type: 'media', multiple: false },
            nestedRelation: { type: 'relation', relation: 'oneToOne' },
          },
        },
        'components.simple': {
          modelType: 'component',
          uid: 'components.simple',
          modelName: 'simple',
          globalId: 'ComponentsSimple',
          category: 'blog',
          info: { displayName: 'Simple' },
          attributes: {
            text: { type: 'string' },
          },
        },
      };
      return models[uid] as Schema.Schema | undefined;
    };

    it('should populate media fields', () => {
      const schemaAttributes = {
        title: { type: 'string' },
        image: { type: 'media', multiple: false },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      const result = buildDeepPopulate(schemaAttributes, mockGetModel);

      expect(result).toEqual({ image: true });
    });

    it('should populate relation fields', () => {
      const schemaAttributes = {
        title: { type: 'string' },
        author: { type: 'relation', relation: 'oneToOne' },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      const result = buildDeepPopulate(schemaAttributes, mockGetModel);

      expect(result).toEqual({ author: true });
    });

    it('should build nested populate for components with media', () => {
      const schemaAttributes = {
        title: { type: 'string' },
        section: {
          type: 'component',
          component: 'components.media-section',
          repeatable: false,
        },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      const result = buildDeepPopulate(schemaAttributes, mockGetModel);

      expect(result).toEqual({
        section: {
          populate: {
            sectionImage: true,
            nestedRelation: true,
          },
        },
      });
    });

    it('should return true for components without nested media/relations', () => {
      const schemaAttributes = {
        title: { type: 'string' },
        simple: {
          type: 'component',
          component: 'components.simple',
          repeatable: false,
        },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      const result = buildDeepPopulate(schemaAttributes, mockGetModel);

      expect(result).toEqual({ simple: true });
    });

    it('should handle dynamic zones with wildcard populate', () => {
      const schemaAttributes = {
        title: { type: 'string' },
        blocks: {
          type: 'dynamiczone',
          components: ['components.media-section'],
        },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      const result = buildDeepPopulate(schemaAttributes, mockGetModel);

      expect(result).toEqual({
        blocks: { populate: '*' },
      });
    });

    it('should ignore system fields', () => {
      const schemaAttributes = {
        id: { type: 'integer' },
        documentId: { type: 'string' },
        createdAt: { type: 'datetime' },
        image: { type: 'media', multiple: false },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      const result = buildDeepPopulate(schemaAttributes, mockGetModel);

      expect(result).toEqual({ image: true });
      expect(result.id).toBeUndefined();
      expect(result.documentId).toBeUndefined();
      expect(result.createdAt).toBeUndefined();
    });

    it('should handle complex nested structures', () => {
      const schemaAttributes = {
        title: { type: 'string' },
        featuredImage: { type: 'media', multiple: false },
        author: { type: 'relation', relation: 'oneToOne' },
        sections: {
          type: 'component',
          component: 'components.media-section',
          repeatable: true,
        },
        blocks: {
          type: 'dynamiczone',
          components: ['components.media-section'],
        },
      } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

      const result = buildDeepPopulate(schemaAttributes, mockGetModel);

      expect(result).toEqual({
        featuredImage: true,
        author: true,
        sections: {
          populate: {
            sectionImage: true,
            nestedRelation: true,
          },
        },
        blocks: { populate: '*' },
      });
    });
  });
});
