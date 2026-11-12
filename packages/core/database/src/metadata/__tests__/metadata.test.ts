import { createMetadata } from '..';

expect.extend({
  toEqualMap(received, expected) {
    // Iterate through expected map
    for (const [key, expectedValue] of expected) {
      const receivedValue = received.get(key);

      // Check if the received map contains the key
      if (!received.has(key)) {
        return {
          message: () => `expected map to contain key '${key}', but it was not found`,
          pass: false,
        };
      }

      // Use Jest's equality check to compare values for the current key
      if (!this.equals(receivedValue, expectedValue)) {
        // Generate a diff string for the first mismatch
        const diffString = this.utils.diff(expectedValue, receivedValue, {
          expand: this.expand,
        });

        return {
          message: () =>
            `expected maps to be equal, but they differ for key '${key}':\n\n${diffString}`,
          pass: false,
        };
      }
    }

    // Ensure the received map does not contain extra keys not present in the expected map
    for (const key of received.keys()) {
      if (!expected.has(key)) {
        return {
          message: () => `received map contains an unexpected key '${key}'`,
          pass: false,
        };
      }
    }

    return {
      message: () => `expected maps to be equal`,
      pass: true,
    };
  },
});

type TestCase = [
  string,
  { type: string; required?: boolean; default?: any },
  { type: string; columnName: string; required?: boolean; default?: any },
];

describe('metadata', () => {
  describe('createMetadata', () => {
    describe('identifiers', () => {
      describe('attribute conversion', () => {
        // Define a base model structure that you'll reuse and modify for each test case
        const baseModel = (attributeName: string, attributeDetails: any) => ({
          uid: 'admin::permission',
          singularName: 'permission',
          tableName: 'admin_permissions',
          attributes: {
            [attributeName]: attributeDetails,
          },
        });

        // Define expected base results to be reused and modified for each test case
        const baseExpected = (attributeName: string, expectedDetails: any) =>
          new Map([
            [
              'admin::permission',
              {
                uid: 'admin::permission',
                singularName: 'permission',
                tableName: 'admin_permissions',
                attributes: {
                  [attributeName]: expectedDetails,
                },
                lifecycles: {},
                indexes: [],
                foreignKeys: [],
                columnToAttribute: {
                  [attributeName]: attributeName,
                },
              },
            ],
          ]);

        // Test cases: Each entry is [attributeName, attributeDetails, expectedDetails]
        const testCases = [
          ['id', { type: 'increments' }, { type: 'increments', columnName: 'id' }], // allows id
          ['documentId', { type: 'string' }, { type: 'string', columnName: 'document_id' }], // allows documentId
          ['document_id', { type: 'string' }, { type: 'string', columnName: 'document_id' }], // allows documentId
          [
            'action',
            { type: 'string', required: true },
            { type: 'string', required: true, columnName: 'action' },
          ],
          [
            'actionParameters',
            { type: 'json', required: false, default: {} },
            { type: 'json', required: false, default: {}, columnName: 'action_parameters' },
          ],
          ['createdAt', { type: 'datetime' }, { type: 'datetime', columnName: 'created_at' }],
          [
            'arbitraryTypeName',
            { type: 'arbitraryType' },
            { type: 'arbitraryType', columnName: 'arbitrary_type_name' },
          ],
        ] satisfies TestCase[];

        test.each(testCases)(
          '%s adds snake_case columnName',
          (attributeName, attributeDetails, expectedDetails) => {
            // Create a model with only the attribute under test
            const models = [baseModel(attributeName, attributeDetails)];

            // Generate the expected Map with only the attribute under test
            const expected = baseExpected(attributeName, expectedDetails);

            // Call your function to convert models to the expected format
            const results = createMetadata(models);

            // Extract the attribute from the results for comparison
            const resultAttribute = results.get('admin::permission').attributes[attributeName];

            // Compare the actual result with the expected result for this attribute
            expect(resultAttribute).toEqual(
              expected.get('admin::permission')?.attributes[attributeName]
            );
          }
        );
      });
      describe('relation conversion', () => {
        describe('error cases', () => {
          test('throws error on duplicate table name', () => {
            const badModels = [
              {
                uid: 'strapi::core-store',
                collectionName: 'strapi_core_store_settings',
                attributes: {
                  key: {
                    type: 'string',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
              {
                uid: 'strapi::test',
                collectionName: 'strapi_test',
                attributes: {
                  key: {
                    type: 'string',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
            ] as any;
            expect(() => createMetadata(badModels)).toThrow(
              'DB table "strapi_core_store_settings" already exists. Change the collectionName of the related content type'
            );
          });

          test('throws error on missing relation uid', () => {
            const badModels = [
              {
                uid: 'strapi::core-store',
                collectionName: 'strapi_core_store_settings',
                attributes: {
                  key: {
                    type: 'string',
                  },
                  role: {
                    configurable: false,
                    type: 'relation',
                    relation: 'manyToOne',
                    inversedBy: 'permissions',
                    target: 'admin::role',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
            ] as any;
            expect(() => createMetadata(badModels)).toThrow(
              'Error on attribute role in model undefined(strapi::core-store): Metadata for "admin::role" not found'
            );
          });

          test('throws error on invalid relation', () => {
            const badModels = [
              {
                uid: 'strapi::core-store',
                collectionName: 'strapi_core_store_settings',
                attributes: {
                  key: {
                    type: 'string',
                  },
                  role: {
                    configurable: false,
                    type: 'relation',
                    relation: 'somethingToNothing',
                    inversedBy: 'permissions',
                    mappedBy: 'permissions',
                    target: 'strapi::core-store',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
            ] as any;
            expect(() => createMetadata(badModels)).toThrow(
              'Error on attribute role in model undefined(strapi::core-store): Unknown relation'
            );
          });

          test('throws error on missing attribute inversedBy attribute', () => {
            const badModels = [
              {
                uid: 'strapi::core-store',
                collectionName: 'strapi_core_store_settings',
                attributes: {
                  key: {
                    type: 'string',
                  },
                  role: {
                    configurable: false,
                    type: 'relation',
                    relation: 'oneToOne',
                    inversedBy: 'permissions',
                    mappedBy: 'permissions',
                    target: 'strapi::core-store',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
            ] as any;
            expect(() => createMetadata(badModels)).toThrow(
              'Error on attribute role in model undefined(strapi::core-store): inversedBy attribute permissions not found target strapi::core-store'
            );
          });

          test('throws error on missing attribute inversedBy attribute', () => {
            const badModels = [
              {
                uid: 'strapi::core-store',
                collectionName: 'strapi_core_store_settings',
                attributes: {
                  key: {
                    type: 'string',
                  },
                  role: {
                    configurable: false,
                    type: 'relation',
                    relation: 'oneToOne',
                    inversedBy: 'permissions',
                    mappedBy: 'permissions',
                    target: 'strapi::core-store',
                  },
                  permissions: {
                    type: 'string',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
            ] as any;
            expect(() => createMetadata(badModels)).toThrow(
              'Error on attribute role in model undefined(strapi::core-store): inversedBy attribute permissions targets non relational attribute in strapi::core-store'
            );
          });

          test('throws error on missing attribute inversedBy attribute', () => {
            const badModels = [
              {
                uid: 'strapi::core-store',
                collectionName: 'strapi_core_store_settings',
                attributes: {
                  key: {
                    type: 'string',
                  },
                  role: {
                    configurable: false,
                    type: 'relation',
                    relation: 'oneToOne',
                    inversedBy: 'permissions',
                    mappedBy: 'permissions',
                    target: 'strapi::core-store',
                  },
                  permissions: {
                    type: 'string',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
            ] as any;
            expect(() => createMetadata(badModels)).toThrow(
              'Error on attribute role in model undefined(strapi::core-store): inversedBy attribute permissions targets non relational attribute in strapi::core-store'
            );
          });

          test('throws error on missing target', () => {
            const badModels = [
              {
                uid: 'strapi::core-store',
                collectionName: 'strapi_core_store_settings',
                attributes: {
                  key: {
                    type: 'string',
                  },
                  role: {
                    type: 'relation',
                    relation: 'oneToOne',
                    target: 'missingtarget',
                  },
                },
                tableName: 'strapi_core_store_settings',
              },
            ] as any;
            expect(() => createMetadata(badModels)).toThrow(
              'Error on attribute role in model undefined(strapi::core-store): Metadata for "missingtarget" not found'
            );
          });

          // The inverse (mappedBy) side creates no join column or join table, so it must check its target on its own
          const inverseSideRelations = [
            ['oneToMany', { relation: 'oneToMany', mappedBy: 'article' }],
            ['oneToOne', { relation: 'oneToOne', mappedBy: 'article' }],
            ['manyToMany', { relation: 'manyToMany', mappedBy: 'articles' }],
          ] as const;

          test.each(inverseSideRelations)(
            'throws error on missing target of an inverse side %s relation',
            (_relation, relationAttribute) => {
              const badModels = [
                {
                  uid: 'api::article.article',
                  singularName: 'article',
                  tableName: 'articles',
                  attributes: {
                    contributors: {
                      type: 'relation',
                      ...relationAttribute,
                      target: 'plugin::users-permissions.user',
                    },
                  },
                },
              ] as any;

              expect(() => createMetadata(badModels)).toThrow(
                'Error on attribute contributors in model article(api::article.article): Metadata for "plugin::users-permissions.user" not found'
              );
            }
          );

          // A manyToMany without a join table builds no join table either, so it must check its target on its own
          test('throws error on missing target of a manyToMany relation without a join table', () => {
            const badModels = [
              {
                uid: 'api::article.article',
                singularName: 'article',
                tableName: 'articles',
                attributes: {
                  contributors: {
                    type: 'relation',
                    relation: 'manyToMany',
                    useJoinTable: false,
                    target: 'plugin::users-permissions.user',
                  },
                },
              },
            ] as any;

            expect(() => createMetadata(badModels)).toThrow(
              'Error on attribute contributors in model article(api::article.article): Metadata for "plugin::users-permissions.user" not found'
            );
          });
        });

        describe('inverse side relations', () => {
          const inverseSideRelations = [
            ['oneToMany', 'manyToOne', { inversedBy: 'contributors' }],
            ['oneToOne', 'oneToOne', { inversedBy: 'contributors' }],
            ['manyToMany', 'manyToMany', { inversedBy: 'contributors' }],
          ] as const;

          test.each(inverseSideRelations)(
            'loads an inverse side %s relation whose target exists',
            (inverseRelation, ownerRelation, ownerAttribute) => {
              const models = [
                {
                  uid: 'api::article.article',
                  singularName: 'article',
                  tableName: 'articles',
                  attributes: {
                    contributors: {
                      type: 'relation',
                      relation: inverseRelation,
                      target: 'api::writer.writer',
                      mappedBy: 'article',
                    },
                  },
                },
                {
                  uid: 'api::writer.writer',
                  singularName: 'writer',
                  tableName: 'writers',
                  attributes: {
                    article: {
                      type: 'relation',
                      relation: ownerRelation,
                      target: 'api::article.article',
                      ...ownerAttribute,
                    },
                  },
                },
              ] as any;

              expect(() => createMetadata(models)).not.toThrow();
            }
          );

          test('does not look up a target for a morphToOne relation', () => {
            const models = [
              {
                uid: 'api::article.article',
                singularName: 'article',
                tableName: 'articles',
                attributes: {
                  related: {
                    type: 'relation',
                    relation: 'morphToOne',
                  },
                },
              },
            ] as any;

            expect(() => createMetadata(models)).not.toThrow();
          });
        });
      });
    });
  });
});
