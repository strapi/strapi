import type { Schema, UID } from '@strapi/types';

import { mergeUnsupportedFields } from '../ai-localizations';

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

    // Helper to create a mock schema from attributes
    const createMockSchema = (
      attributes: Record<string, Schema.Attribute.AnyAttribute>
    ): Schema.Schema => {
      return {
        modelType: 'contentType',
        uid: 'api::test.test',
        modelName: 'test',
        globalId: 'Test',
        info: { displayName: 'Test', singularName: 'test', pluralName: 'tests' },
        attributes,
      } as Schema.Schema;
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

      const schema = createMockSchema(schemaAttributes);

      it('should preserve media fields from source document', async () => {
        const targetData = {
          title: 'Translated Title',
          content: 'Translated content',
        };
        const sourceDoc = {
          title: 'Original Title',
          content: 'Original content',
          featuredImage: { id: 1, url: '/image.jpg' },
        };

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.title).toBe('Translated Title');
        expect(result.content).toBe('Translated content');
        expect(result.featuredImage).toEqual({ id: 1, url: '/image.jpg' });
      });

      it('should preserve boolean fields from source document', async () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          isFeatured: true,
        };

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.title).toBe('Translated Title');
        expect(result.isFeatured).toBe(true);
      });

      it('should preserve enumeration fields from source document', async () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          backgroundColor: 'blue',
        };

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.title).toBe('Translated Title');
        expect(result.backgroundColor).toBe('blue');
      });

      it('should preserve relation fields from source document', async () => {
        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          author: { id: 5, name: 'John Doe' },
        };

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.title).toBe('Translated Title');
        expect(result.author).toEqual({ id: 5, name: 'John Doe' });
      });

      it('should preserve multiple unsupported fields at once', async () => {
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

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.title).toBe('Translated Title');
        expect(result.content).toBe('Translated content');
        expect(result.featuredImage).toEqual({ id: 1, url: '/image.jpg' });
        expect(result.backgroundColor).toBe('blue');
        expect(result.isFeatured).toBe(true);
        expect(result.author).toEqual({ id: 5 });
      });

      it('should not overwrite existing unsupported fields in target', async () => {
        const targetData = {
          title: 'Translated Title',
          isFeatured: false, // Already set in target
        };
        const sourceDoc = {
          title: 'Original Title',
          isFeatured: true,
        };

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.isFeatured).toBe(false); // Should keep target value
      });

      it('should handle null source document', async () => {
        const targetData = {
          title: 'Translated Title',
        };

        const result = await mergeUnsupportedFields(targetData, null, schema, mockGetModel);

        expect(result).toEqual({ title: 'Translated Title' });
      });

      it('should ignore system fields', async () => {
        const schemaWithSystemFields = {
          ...schemaAttributes,
          id: { type: 'integer' },
          documentId: { type: 'string' },
          createdAt: { type: 'datetime' },
        } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

        const schemaWithSystem = createMockSchema(schemaWithSystemFields);

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

        const result = await mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schemaWithSystem,
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

      const schema = createMockSchema(schemaWithComponent);

      it('should preserve unsupported fields in single component', async () => {
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

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.title).toBe('Translated Title');
        expect(result.seo.metaTitle).toBe('Translated Meta');
        expect(result.seo.ogImage).toEqual({ id: 1, url: '/og.jpg' });
      });

      it('should preserve unsupported fields from component even if not in target', async () => {
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

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        // Only unsupported fields (media) should be preserved, not translatable text
        expect(result.seo.ogImage).toEqual({ id: 1, url: '/og.jpg' });
        expect(result.seo.metaTitle).toBeUndefined();
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

      const schema = createMockSchema(schemaWithRepeatable);

      it('should preserve unsupported fields in repeatable components', async () => {
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

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

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

      it('should preserve unsupported fields from repeatable component even if not in target', async () => {
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

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        // Only unsupported fields (media) should be preserved, not translatable text
        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].sectionImage).toEqual({ id: 1, url: '/img1.jpg' });
        expect(result.sections[0].sectionTitle).toBeUndefined();
      });

      it('should handle mismatched array lengths gracefully', async () => {
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

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.sections).toHaveLength(3);
        expect(result.sections[0].sectionImage).toEqual({ id: 1 });
        expect(result.sections[1].sectionImage).toEqual({ id: 2 });
        expect(result.sections[2].sectionTitle).toBe('Translated Section 3');
        expect(result.sections[2].sectionImage).toBeUndefined();
      });
    });

    describe('relation and media internal fields', () => {
      const mockGetModelWithRelationTarget = (uid: UID.Schema): Schema.Schema | undefined => {
        const models: Record<string, unknown> = {
          'api::author.author': {
            modelType: 'contentType',
            uid: 'api::author.author',
            modelName: 'author',
            globalId: 'Author',
            info: { displayName: 'Author', singularName: 'author', pluralName: 'authors' },
            attributes: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
          'plugin::upload.file': {
            modelType: 'contentType',
            uid: 'plugin::upload.file',
            modelName: 'file',
            globalId: 'UploadFile',
            info: { displayName: 'File', singularName: 'file', pluralName: 'files' },
            attributes: {
              name: { type: 'string' },
              url: { type: 'string' },
              mime: { type: 'string' },
              width: { type: 'integer' },
              height: { type: 'integer' },
            },
          },
        };
        return models[uid] as Schema.Schema | undefined;
      };

      it('should preserve all internal fields of relation objects (including id)', async () => {
        const schemaAttributes = {
          title: { type: 'string' },
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
        } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

        const schema = createMockSchema(schemaAttributes);

        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          author: { id: 5, name: 'John Doe', email: 'john@example.com' },
        };

        const result = await mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schema,
          mockGetModelWithRelationTarget
        );

        expect(result.title).toBe('Translated Title');
        // All relation fields including id must be preserved intact
        expect(result.author).toEqual({ id: 5, name: 'John Doe', email: 'john@example.com' });
      });

      it('should preserve all internal fields of media objects (including id)', async () => {
        const schemaAttributes = {
          title: { type: 'string' },
          cover: { type: 'media', multiple: false },
        } as unknown as Record<string, Schema.Attribute.AnyAttribute>;

        const schema = createMockSchema(schemaAttributes);

        const targetData = {
          title: 'Translated Title',
        };
        const sourceDoc = {
          title: 'Original Title',
          cover: { id: 10, name: 'cover.jpg', url: '/uploads/cover.jpg', mime: 'image/jpeg' },
        };

        const result = await mergeUnsupportedFields(
          targetData,
          sourceDoc,
          schema,
          mockGetModelWithRelationTarget
        );

        expect(result.title).toBe('Translated Title');
        expect(result.cover).toEqual({
          id: 10,
          name: 'cover.jpg',
          url: '/uploads/cover.jpg',
          mime: 'image/jpeg',
        });
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

      const schema = createMockSchema(schemaWithDynamicZone);

      it('should preserve unsupported fields in dynamic zone components', async () => {
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

        const result = await mergeUnsupportedFields(targetData, sourceDoc, schema, mockGetModel);

        expect(result.title).toBe('Translated Title');
        expect(result.blocks[0].sectionTitle).toBe('Translated Section');
        expect(result.blocks[0].sectionImage).toEqual({ id: 1, url: '/img.jpg' });
        expect(result.blocks[0].sectionBackground).toBe('blue');
        expect(result.blocks[1].metaTitle).toBe('Translated Meta');
        expect(result.blocks[1].ogImage).toEqual({ id: 2, url: '/og.jpg' });
      });
    });
  });
});
