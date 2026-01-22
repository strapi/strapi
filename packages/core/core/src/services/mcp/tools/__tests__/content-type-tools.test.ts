import { generateContentTypeTools } from '../content-type-tools';
import { getDisplayableContentTypes } from '../../utils/getDisplayableContentTypes';

// Mock the dependencies
jest.mock('../../tool-registry', () => ({
  makeMcpToolDefinition: jest.fn((def) => def),
}));

jest.mock('../../utils/getDisplayableContentTypes', () => ({
  getDisplayableContentTypes: jest.fn(),
}));

const mockedGetDisplayableContentTypes = jest.mocked(getDisplayableContentTypes);

describe('Content Type Tools', () => {
  const createMockStrapi = (contentTypes: Record<string, any> = {}) =>
    ({
      contentTypes,
      documents: jest.fn(() => ({
        findMany: jest.fn(),
        findOne: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      })),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateContentTypeTools', () => {
    describe('field information in descriptions', () => {
      it('should include required fields in create tool description', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::article.article',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Article',
                singularName: 'article',
                pluralName: 'articles',
              },
              attributes: {
                title: { type: 'string', required: true },
                content: { type: 'richtext', required: true },
                slug: { type: 'string', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_article');
        expect(createTool).toBeDefined();
        expect(createTool?.description).toContain(
          'Required fields: title (string), content (richtext)'
        );
        expect(createTool?.description).toContain('Optional fields: slug (string)');
      });

      it('should include optional fields in create tool description', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::tag.tag',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Tag',
                singularName: 'tag',
                pluralName: 'tags',
              },
              attributes: {
                name: { type: 'string', required: true },
                description: { type: 'text', required: false },
                color: { type: 'string', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_tag');
        expect(createTool).toBeDefined();
        expect(createTool?.description).toContain('Required fields: name (string)');
        expect(createTool?.description).toContain(
          'Optional fields: description (text), color (string)'
        );
      });

      it('should handle content type with only required fields', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::setting.setting',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Setting',
                singularName: 'setting',
                pluralName: 'settings',
              },
              attributes: {
                key: { type: 'string', required: true },
                value: { type: 'string', required: true },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_setting');
        expect(createTool).toBeDefined();
        expect(createTool?.description).toContain('Required fields: key (string), value (string)');
        expect(createTool?.description).not.toContain('Optional fields:');
      });

      it('should handle content type with only optional fields', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::note.note',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Note',
                singularName: 'note',
                pluralName: 'notes',
              },
              attributes: {
                title: { type: 'string', required: false },
                body: { type: 'text', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_note');
        expect(createTool).toBeDefined();
        expect(createTool?.description).not.toContain('Required fields:');
        expect(createTool?.description).toContain('Optional fields: title (string), body (text)');
      });

      it('should handle content type with no user-defined fields', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::empty.empty',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Empty',
                singularName: 'empty',
                pluralName: 'empties',
              },
              attributes: {
                // Only internal fields
                createdAt: { type: 'datetime' },
                updatedAt: { type: 'datetime' },
                publishedAt: { type: 'datetime' },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_empty');
        expect(createTool).toBeDefined();
        // Should not crash, just have minimal description
        expect(createTool?.description).toContain('Create a new empty');
      });
    });

    describe('internal fields filtering', () => {
      it('should exclude internal Strapi fields from descriptions', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::post.post',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Post',
                singularName: 'post',
                pluralName: 'posts',
              },
              attributes: {
                title: { type: 'string', required: true },
                // Internal fields that should be excluded
                createdBy: { type: 'relation' },
                updatedBy: { type: 'relation' },
                createdAt: { type: 'datetime' },
                updatedAt: { type: 'datetime' },
                publishedAt: { type: 'datetime' },
                documentId: { type: 'string' },
                localizations: { type: 'relation' },
                locale: { type: 'string' },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_post');
        expect(createTool).toBeDefined();

        // Should only include user-defined field
        expect(createTool?.description).toContain('title (string)');

        // Should NOT include internal fields
        expect(createTool?.description).not.toContain('createdBy');
        expect(createTool?.description).not.toContain('updatedBy');
        expect(createTool?.description).not.toContain('createdAt');
        expect(createTool?.description).not.toContain('updatedAt');
        expect(createTool?.description).not.toContain('publishedAt');
        expect(createTool?.description).not.toContain('documentId');
        expect(createTool?.description).not.toContain('localizations');
        expect(createTool?.description).not.toContain('locale');
      });
    });

    describe('documentId examples in descriptions', () => {
      it('should include realistic documentId example in get tool', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::article.article',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Article',
                singularName: 'article',
                pluralName: 'articles',
              },
              attributes: {
                title: { type: 'string' },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const getTool = tools.find((t) => t.name === 'get_article');
        expect(getTool).toBeDefined();

        const inputSchema = getTool?.inputSchema as any;
        const documentIdDescription = inputSchema?.shape?.documentId?.description;
        expect(documentIdDescription).toContain('z7v8zma53x01r6oceimv922b');
      });

      it('should include realistic documentId example in update tool', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::article.article',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Article',
                singularName: 'article',
                pluralName: 'articles',
              },
              attributes: {
                title: { type: 'string' },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const updateTool = tools.find((t) => t.name === 'update_article');
        expect(updateTool).toBeDefined();

        const inputSchema = updateTool?.inputSchema as any;
        const documentIdDescription = inputSchema?.shape?.documentId?.description;
        expect(documentIdDescription).toContain('z7v8zma53x01r6oceimv922b');
      });

      it('should include realistic documentId example in delete tool', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::article.article',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Article',
                singularName: 'article',
                pluralName: 'articles',
              },
              attributes: {
                title: { type: 'string' },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const deleteTool = tools.find((t) => t.name === 'delete_article');
        expect(deleteTool).toBeDefined();

        const inputSchema = deleteTool?.inputSchema as any;
        const documentIdDescription = inputSchema?.shape?.documentId?.description;
        expect(documentIdDescription).toContain('z7v8zma53x01r6oceimv922b');
      });
    });

    describe('list tool field information', () => {
      it('should include available fields in list tool description', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::product.product',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Product',
                singularName: 'product',
                pluralName: 'products',
              },
              attributes: {
                name: { type: 'string', required: true },
                price: { type: 'decimal', required: true },
                description: { type: 'text', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const listTool = tools.find((t) => t.name === 'list_products');
        expect(listTool).toBeDefined();
        expect(listTool?.description).toContain('Available fields: name, price, description');
      });

      it('should include available fields in filters description', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::category.category',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Category',
                singularName: 'category',
                pluralName: 'categories',
              },
              attributes: {
                name: { type: 'string', required: true },
                slug: { type: 'string', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const listTool = tools.find((t) => t.name === 'list_categories');
        expect(listTool).toBeDefined();

        const inputSchema = listTool?.inputSchema as any;
        const filtersDescription = inputSchema?.shape?.filters?.description;
        expect(filtersDescription).toContain('Available fields: name, slug');
      });
    });

    describe('update tool field information', () => {
      it('should include available fields in update tool description', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::user-profile.user-profile',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'User Profile',
                singularName: 'user-profile',
                pluralName: 'user-profiles',
              },
              attributes: {
                bio: { type: 'text', required: false },
                avatar: { type: 'media', required: false },
                website: { type: 'string', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const updateTool = tools.find((t) => t.name === 'update_user-profile');
        expect(updateTool).toBeDefined();
        expect(updateTool?.description).toContain(
          'Optional fields: bio (text), avatar (media), website (string)'
        );
      });

      it('should include available fields in data parameter description', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::setting.setting',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Setting',
                singularName: 'setting',
                pluralName: 'settings',
              },
              attributes: {
                key: { type: 'string', required: true },
                value: { type: 'json', required: true },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const updateTool = tools.find((t) => t.name === 'update_setting');
        expect(updateTool).toBeDefined();

        const inputSchema = updateTool?.inputSchema as any;
        const dataDescription = inputSchema?.shape?.data?.description;
        expect(dataDescription).toContain('Available fields: key, value');
        expect(dataDescription).toContain('Example: { "fieldName": "newValue" }');
      });
    });

    describe('create tool data parameter', () => {
      it('should include example format in data parameter description', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::comment.comment',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Comment',
                singularName: 'comment',
                pluralName: 'comments',
              },
              attributes: {
                content: { type: 'text', required: true },
                author: { type: 'string', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_comment');
        expect(createTool).toBeDefined();

        const inputSchema = createTool?.inputSchema as any;
        const dataDescription = inputSchema?.shape?.data?.description;
        expect(dataDescription).toContain('Example: { "fieldName": "value" }');
        expect(dataDescription).toContain('Required fields: content (text)');
        expect(dataDescription).toContain('Optional fields: author (string)');
      });
    });

    describe('single type tools', () => {
      it('should not generate create tool for single types', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::homepage.homepage',
            contentType: {
              kind: 'singleType',
              info: {
                displayName: 'Homepage',
                singularName: 'homepage',
                pluralName: 'homepages',
              },
              attributes: {
                title: { type: 'string', required: true },
                heroText: { type: 'text', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_homepage');
        expect(createTool).toBeUndefined();
      });

      it('should generate get and update tools for single types', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::about.about',
            contentType: {
              kind: 'singleType',
              info: {
                displayName: 'About',
                singularName: 'about',
                pluralName: 'abouts',
              },
              attributes: {
                title: { type: 'string', required: true },
                content: { type: 'richtext', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const getTool = tools.find((t) => t.name === 'get_about');
        const updateTool = tools.find((t) => t.name === 'update_about');

        expect(getTool).toBeDefined();
        expect(updateTool).toBeDefined();
      });
    });

    describe('different field types', () => {
      it('should correctly identify field types in descriptions', () => {
        mockedGetDisplayableContentTypes.mockReturnValue([
          {
            uid: 'api::mixed.mixed',
            contentType: {
              kind: 'collectionType',
              info: {
                displayName: 'Mixed',
                singularName: 'mixed',
                pluralName: 'mixeds',
              },
              attributes: {
                textField: { type: 'text', required: true },
                numberField: { type: 'integer', required: true },
                boolField: { type: 'boolean', required: false },
                dateField: { type: 'date', required: false },
                relationField: { type: 'relation', required: false },
                mediaField: { type: 'media', required: false },
                jsonField: { type: 'json', required: false },
              },
            },
          },
        ]);

        const strapi = createMockStrapi();
        const tools = generateContentTypeTools({ strapi });

        const createTool = tools.find((t) => t.name === 'create_mixed');
        expect(createTool).toBeDefined();

        expect(createTool?.description).toContain('textField (text)');
        expect(createTool?.description).toContain('numberField (integer)');
        expect(createTool?.description).toContain('boolField (boolean)');
        expect(createTool?.description).toContain('dateField (date)');
        expect(createTool?.description).toContain('relationField (relation)');
        expect(createTool?.description).toContain('mediaField (media)');
        expect(createTool?.description).toContain('jsonField (json)');
      });
    });
  });
});
