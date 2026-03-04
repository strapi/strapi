import { testData } from '../../../../tests/data';
import { getDirectParent, handleInvisibleAttributes, removeProhibitedFields } from '../data';

const defaultFieldsValues = {
  name: 'name',
  password: '',
};

describe('data', () => {
  describe('getDirectParent', () => {
    const values = {
      title: 'hello',
      conditional: [
        {
          name: 'wow',
          url: 'some',
          nested: {
            name: 'name',
            test: '',
          },
        },
      ],
    };

    it('should return the root object for a top-level path', () => {
      expect(getDirectParent(values, 'title')).toBe(values);
    });

    it('should return the array item parent for dynamic zone fields', () => {
      expect(getDirectParent(values, 'conditional.0.url')).toEqual(values.conditional[0]);
    });

    it('should return the nested object for deep fields', () => {
      expect(getDirectParent(values, 'conditional.0.nested.test')).toEqual(
        values.conditional[0].nested
      );
    });

    it('should return undefined for invalid paths', () => {
      expect(getDirectParent(values, 'conditional.foo.url')).toBeUndefined();
    });
  });

  describe('removeProhibitedFields', () => {
    it('should return an empty object', () => {
      const { components, contentType } = testData;

      expect(removeProhibitedFields(['password'])(contentType, components)({})).toEqual({});
    });

    it('should return the initial data if there is no password field', () => {
      const { components, contentType } = testData;

      expect(
        removeProhibitedFields(['password'])(contentType, components)({ name: 'name' })
      ).toEqual({
        name: 'name',
      });
    });

    it('should remove the password field for a simple data structure', () => {
      const { components, contentType } = testData;

      expect(
        removeProhibitedFields(['password'])(contentType, components)({
          name: 'name',
          password: 'password',
        })
      ).toEqual(defaultFieldsValues);
    });

    it('should remove all password fields', () => {
      const { components, contentType, modifiedData } = testData;

      const result = removeProhibitedFields(['password'])(contentType, components)(modifiedData);

      expect(result).toEqual({
        createdAt: '2020-04-28T13:22:13.033Z',
        dz: [
          {
            __component: 'compos.sub-compo',
            id: 7,
            ...defaultFieldsValues,
          },
          {
            id: 4,
            documentId: '456789',
            ...defaultFieldsValues,
            subcomponotrepeatable: null,
            subrepeatable: [],
            __component: 'compos.test-compo',
          },
          {
            id: 5,
            documentId: '567890',
            ...defaultFieldsValues,
            subcomponotrepeatable: { id: 9, name: 'name', password: '' },
            subrepeatable: [{ id: 8, name: 'name', password: '' }],
            __component: 'compos.test-compo',
          },
          {
            id: 6,
            documentId: '678901',
            name: null,
            password: null,
            subcomponotrepeatable: null,
            subrepeatable: [],
            __component: 'compos.test-compo',
          },
        ],
        id: 1,
        name: 'name',
        notrepeatable: {
          id: 1,
          documentId: '123456',
          ...defaultFieldsValues,
          subcomponotrepeatable: { id: 4, name: 'name', password: '' },
          subrepeatable: [
            { id: 1, name: 'name', password: '' },
            { id: 2, name: 'name', password: '' },
            { id: 3, name: 'name', password: '' },
          ],
        },
        password: '',
        repeatable: [
          {
            id: 2,
            documentId: '234567',
            ...defaultFieldsValues,
            subrepeatable: [{ id: 5, name: 'name', password: '' }],
            subcomponotrepeatable: { id: 6, name: 'name', password: '' },
          },
          {
            id: 3,
            documentId: '345678',
            ...defaultFieldsValues,
            subrepeatable: [],
            subcomponotrepeatable: null,
          },
        ],
        updatedAt: '2020-04-28T13:22:13.033Z',
      });
    });
  });

  describe('handleInvisibleAttributes', () => {
    it('should remove deleted components', () => {
      const result = handleInvisibleAttributes(
        {
          documentId: 'xfwixs09jhwes2rw77cib73o',
          notrepeat_req: {
            id: 1,
            name: 'toto',
          },
          notrepeat_optional: null,
          repeat_req: [
            {
              id: 3,
              name: 'foobar',
            },
          ],
          repeat_req_min: [],
        },
        {
          schema: {
            uid: 'api::foo.bar',
            kind: 'collectionType',
            modelType: 'contentType',
            modelName: 'bar',
            globalId: 'FooBar',
            info: {
              displayName: 'FooBar',
              singularName: 'foobar',
              pluralName: 'foobars',
              description: '',
            },
            options: {
              draftAndPublish: false,
            },
            pluginOptions: {},
            attributes: {
              documentId: {
                type: 'string',
              },
              id: {
                type: 'integer',
              },
              notrepeat_req: {
                type: 'component',
                component: 'blog.test-como',
                repeatable: false,
                required: true,
              },
              notrepeat_optional: {
                type: 'component',
                component: 'blog.test-como',
                repeatable: false,
              },
              repeat_req: {
                type: 'component',
                component: 'blog.test-como',
                repeatable: true,
                required: true,
              },
              repeat_req_min: {
                type: 'component',
                component: 'blog.test-como',
                repeatable: true,
                required: false,
                min: 2,
              },
            },
          },
          initialValues: {
            documentId: 'xfwixs09jhwes2rw77cib73o',
            city: 'city x',
            categories: {
              connect: [],
              disconnect: [],
            },
            notrepeat_req: {
              id: 1,
              name: 'toto',
            },
            notrepeat_optional: {
              id: 4,
              name: 'I will be deleted',
            },
            repeat_req: [
              {
                id: 3,
                name: 'wow',
              },
            ],
            repeat_req_min: [],
          },
          components: {},
        }
      );

      expect(result).toEqual({
        data: {
          documentId: 'xfwixs09jhwes2rw77cib73o',
          notrepeat_req: {
            id: 1,
            name: 'toto',
          },
          notrepeat_optional: null,
          repeat_req: [
            {
              id: 3,
              name: 'foobar',
            },
          ],
          repeat_req_min: [],
        },
        removedAttributes: [],
      });
    });

    it('should preserve fields with visible: false when they have initialValues', () => {
      const result = handleInvisibleAttributes(
        {
          documentId: 'test-doc-id',
          title: 'My Title',
          description: 'My Description',
          // sitemap_exclude is not in the data because it has visible: false (not rendered in UI)
        },
        {
          schema: {
            uid: 'api::article.article',
            kind: 'collectionType',
            modelType: 'contentType',
            modelName: 'article',
            globalId: 'Article',
            info: {
              displayName: 'Article',
              singularName: 'article',
              pluralName: 'articles',
              description: '',
            },
            options: {},
            pluginOptions: {},
            attributes: {
              documentId: {
                type: 'string',
              },
              title: {
                type: 'string',
              },
              description: {
                type: 'text',
              },
              sitemap_exclude: {
                type: 'boolean',
                visible: false,
                private: true,
                default: false,
              },
            },
          },
          initialValues: {
            documentId: 'test-doc-id',
            title: 'My Title',
            description: 'My Description',
            sitemap_exclude: false,
          },
          components: {},
        }
      );

      // sitemap_exclude should be preserved from initialValues because visible:false fields are passed through
      expect(result.data).toEqual({
        documentId: 'test-doc-id',
        title: 'My Title',
        description: 'My Description',
        sitemap_exclude: false, // ✅ Preserved from initialValues
      });
      expect(result.removedAttributes).toEqual([]);
    });

    it('should preserve fields with visible: false from data when provided', () => {
      const result = handleInvisibleAttributes(
        {
          title: 'Updated Title',
          sitemap_exclude: true, // User somehow provides this in the data
        },
        {
          schema: {
            uid: 'api::article.article',
            kind: 'collectionType',
            modelType: 'contentType',
            modelName: 'article',
            globalId: 'Article',
            info: {
              displayName: 'Article',
              singularName: 'article',
              pluralName: 'articles',
              description: '',
            },
            options: {},
            pluginOptions: {},
            attributes: {
              title: {
                type: 'string',
              },
              sitemap_exclude: {
                type: 'boolean',
                visible: false,
                private: true,
                default: false,
              },
            },
          },
          initialValues: {
            title: 'Original Title',
            sitemap_exclude: false,
          },
          components: {},
        }
      );

      // sitemap_exclude should be taken from data (not initialValues) because it's provided
      expect(result.data).toEqual({
        title: 'Updated Title',
        sitemap_exclude: true, // ✅ From data, not initialValues
      });
      expect(result.removedAttributes).toEqual([]);
    });

    it('should not include visible:false fields when not in data or initialValues', () => {
      const result = handleInvisibleAttributes(
        {
          title: 'New Title',
          // sitemap_exclude not in data (not rendered in UI)
        },
        {
          schema: {
            uid: 'api::article.article',
            kind: 'collectionType',
            modelType: 'contentType',
            modelName: 'article',
            globalId: 'Article',
            info: {
              displayName: 'Article',
              singularName: 'article',
              pluralName: 'articles',
              description: '',
            },
            options: {},
            pluginOptions: {},
            attributes: {
              title: {
                type: 'string',
              },
              sitemap_exclude: {
                type: 'boolean',
                visible: false,
                private: true,
                default: false,
              },
            },
          },
          initialValues: {
            title: 'New Title',
            // sitemap_exclude not in initialValues either
          },
          components: {},
        }
      );

      // sitemap_exclude should NOT be in the result (not in data or initialValues)
      expect(result.data).toEqual({
        title: 'New Title',
      });
      expect(result.data).not.toHaveProperty('sitemap_exclude');
      expect(result.removedAttributes).toEqual([]);
    });

    it('should handle fields with conditions.visible (JSON Logic) correctly', () => {
      const result = handleInvisibleAttributes(
        {
          type: 'international',
          title: 'My Title',
          internationalCode: 'US',
        },
        {
          schema: {
            uid: 'api::article.article',
            kind: 'collectionType',
            modelType: 'contentType',
            modelName: 'article',
            globalId: 'Article',
            info: {
              displayName: 'Article',
              singularName: 'article',
              pluralName: 'articles',
              description: '',
            },
            options: {},
            pluginOptions: {},
            attributes: {
              type: {
                type: 'enumeration',
                enum: ['local', 'international'],
              },
              title: {
                type: 'string',
              },
              internationalCode: {
                type: 'string',
                conditions: {
                  visible: {
                    '==': [{ var: 'type' }, 'international'],
                  },
                },
              },
            },
          },
          initialValues: {},
          components: {},
        }
      );

      // internationalCode should be included because condition evaluates to true
      expect(result.data).toEqual({
        type: 'international',
        title: 'My Title',
        internationalCode: 'US',
      });
      expect(result.removedAttributes).toEqual([]);
    });

    it('should remove fields when conditions.visible evaluates to false', () => {
      const result = handleInvisibleAttributes(
        {
          type: 'local',
          title: 'My Title',
          internationalCode: 'US',
        },
        {
          schema: {
            uid: 'api::article.article',
            kind: 'collectionType',
            modelType: 'contentType',
            modelName: 'article',
            globalId: 'Article',
            info: {
              displayName: 'Article',
              singularName: 'article',
              pluralName: 'articles',
              description: '',
            },
            options: {},
            pluginOptions: {},
            attributes: {
              type: {
                type: 'enumeration',
                enum: ['local', 'international'],
              },
              title: {
                type: 'string',
              },
              internationalCode: {
                type: 'string',
                conditions: {
                  visible: {
                    '==': [{ var: 'type' }, 'international'],
                  },
                },
              },
            },
          },
          initialValues: {},
          components: {},
        }
      );

      // internationalCode should be removed because condition evaluates to false
      expect(result.data).toEqual({
        type: 'local',
        title: 'My Title',
      });
      expect(result.data).not.toHaveProperty('internationalCode');
      expect(result.removedAttributes).toEqual(['internationalCode']);
    });
  });
});
