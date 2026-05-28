import modelConfigurationValidation from '../model-configuration';

describe('model-configuration validation', () => {
  // Mock strapi service
  const mockGetService = jest.fn();

  beforeAll(() => {
    global.strapi = {
      service: mockGetService,
      getModel: jest.fn().mockReturnValue({
        attributes: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'text' },
        },
      }),
    } as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock content-types service
    mockGetService.mockImplementation((serviceName) => {
      if (serviceName === 'plugin::content-manager.content-types') {
        return {
          findContentType: jest.fn().mockReturnValue({
            attributes: {
              id: { type: 'integer' },
              title: { type: 'string' },
              description: { type: 'text' },
            },
          }),
        };
      }
      return {};
    });
  });

  const mockSchema = {
    attributes: {
      title: { type: 'string' },
      description: { type: 'text' },
      published: { type: 'boolean' },
      category: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::category.category',
        targetModel: 'api::category.category',
      },
    },
  };

  describe('root schema structure', () => {
    it('should validate a complete valid configuration', async () => {
      const validConfig = {
        settings: {
          bulkable: true,
          filterable: true,
          pageSize: 10,
          searchable: true,
          mainField: 'title',
          defaultSortBy: 'id',
          defaultSortOrder: 'ASC',
        },
        metadatas: {
          title: {
            edit: {
              label: 'Title',
              description: 'Article title',
              placeholder: 'Enter title here',
              editable: true,
              visible: true,
            },
            list: {
              label: 'Title',
              searchable: true,
              sortable: true,
            },
          },
        },
        layouts: {
          edit: [[{ name: 'title', size: 6 }]],
          list: ['title'],
        },
        options: {},
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(validConfig)).resolves.toBeDefined();
    });

    it('should allow null values for optional root properties', async () => {
      const configWithNulls = {
        settings: null,
        metadatas: null,
        layouts: null,
        options: {},
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(configWithNulls)).resolves.toBeDefined();
    });

    it('should reject unknown properties', async () => {
      const invalidConfig = {
        settings: {},
        metadatas: {},
        layouts: {},
        options: {},
        unknownProperty: 'should not be allowed',
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(invalidConfig)).rejects.toThrow();
    });
  });

  describe('metadatas validation', () => {
    describe('edit metadata', () => {
      it('should accept valid edit metadata with all fields', async () => {
        const config = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                description: 'Field for article title',
                placeholder: 'Enter your title here',
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        await expect(schema.validate(config)).resolves.toBeDefined();
      });

      it('should accept null values for description and placeholder', async () => {
        const config = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                description: null,
                placeholder: null,
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        const result = await schema.validate(config);

        expect(result.metadatas.title.edit.description).toBeNull();
        expect(result.metadatas.title.edit.placeholder).toBeNull();
      });

      it('should accept empty strings for description and placeholder', async () => {
        const config = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                description: '',
                placeholder: '',
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        const result = await schema.validate(config);

        expect(result.metadatas.title.edit.description).toBe('');
        expect(result.metadatas.title.edit.placeholder).toBe('');
      });

      it('should accept undefined values for description and placeholder', async () => {
        const config = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                // description and placeholder are undefined
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        const result = await schema.validate(config);
        expect(result.metadatas.title.edit.description).toBeUndefined();
        expect(result.metadatas.title.edit.placeholder).toBeUndefined();
        await expect(schema.validate(config)).resolves.toBeDefined();
      });

      it('should convert non-string values for description to strings', async () => {
        const config = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                description: 123, // Will be converted to string
                placeholder: 'Valid placeholder',
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        const result = await schema.validate(config);
        expect(result.metadatas.title.edit.description).toBe('123');
      });

      it('should reject non-string values for placeholder', async () => {
        const config = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                description: 'Valid description',
                placeholder: ['invalid', 'array'], // Invalid: array instead of string
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        await expect(schema.validate(config)).rejects.toThrow();
      });

      it('should convert boolean values for description and placeholder to strings', async () => {
        const configWithBooleanDescription = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                description: true, // Will be converted to string
                placeholder: 'Valid placeholder',
                editable: true,
                visible: true,
              },
            },
          },
        };

        const configWithBooleanPlaceholder = {
          metadatas: {
            title: {
              edit: {
                label: 'Title Field',
                description: 'Valid description',
                placeholder: false, // Will be converted to string
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        const result1 = await schema.validate(configWithBooleanDescription);
        const result2 = await schema.validate(configWithBooleanPlaceholder);

        expect(result1.metadatas.title.edit.description).toBe('true');
        expect(result2.metadatas.title.edit.placeholder).toBe('false');
      });
    });

    describe('list metadata', () => {
      it('should accept valid list metadata', async () => {
        const config = {
          metadatas: {
            title: {
              list: {
                label: 'Title',
                searchable: true,
                sortable: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        await expect(schema.validate(config)).resolves.toBeDefined();
      });
    });

    describe('multiple attributes', () => {
      it('should validate multiple attributes with nullable description and placeholder', async () => {
        const config = {
          metadatas: {
            title: {
              edit: {
                label: 'Title',
                description: null,
                placeholder: 'Enter title',
                editable: true,
                visible: true,
              },
            },
            description: {
              edit: {
                label: 'Description',
                description: 'Long description field',
                placeholder: null,
                editable: true,
                visible: true,
              },
            },
            published: {
              edit: {
                label: 'Published',
                description: null,
                placeholder: null,
                editable: true,
                visible: true,
              },
            },
          },
        };

        const schema = modelConfigurationValidation(mockSchema);
        const result = await schema.validate(config);

        expect(result.metadatas.title.edit.description).toBeNull();
        expect(result.metadatas.title.edit.placeholder).toBe('Enter title');
        expect(result.metadatas.description.edit.description).toBe('Long description field');
        expect(result.metadatas.description.edit.placeholder).toBeNull();
        expect(result.metadatas.published.edit.description).toBeNull();
        expect(result.metadatas.published.edit.placeholder).toBeNull();
      });
    });
  });

  describe('settings validation', () => {
    it('should validate required settings fields', async () => {
      const config = {
        settings: {
          bulkable: true,
          filterable: true,
          pageSize: 25,
          searchable: false,
          mainField: 'title',
          defaultSortBy: 'id',
          defaultSortOrder: 'DESC',
        },
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(config)).resolves.toBeDefined();
    });

    it('should enforce pageSize limits', async () => {
      const configTooSmall = {
        settings: {
          bulkable: true,
          filterable: true,
          pageSize: 5, // Too small
          searchable: true,
        },
      };

      const configTooLarge = {
        settings: {
          bulkable: true,
          filterable: true,
          pageSize: 150, // Too large
          searchable: true,
        },
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(configTooSmall)).rejects.toThrow();
      await expect(schema.validate(configTooLarge)).rejects.toThrow();
    });
  });

  describe('layouts validation', () => {
    it('should accept valid edit layouts', async () => {
      const config = {
        layouts: {
          edit: [
            [
              { name: 'title', size: 6 },
              { name: 'published', size: 6 },
            ],
            [{ name: 'description', size: 12 }],
          ],
          list: ['title', 'published'],
        },
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(config)).resolves.toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty metadatas object', async () => {
      const config = {
        metadatas: {},
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(config)).resolves.toBeDefined();
    });

    it('should handle partial edit metadata', async () => {
      const config = {
        metadatas: {
          title: {
            edit: {
              label: 'Title',
              // Only label provided, other fields should be optional
            },
          },
        },
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(config)).resolves.toBeDefined();
    });

    it('should maintain original behavior for non-nullable fields', async () => {
      const config = {
        metadatas: {
          title: {
            edit: {
              label: null, // Label should not be nullable
              description: null, // This should be fine
              placeholder: null, // This should be fine
              editable: true,
              visible: true,
            },
          },
        },
      };

      const schema = modelConfigurationValidation(mockSchema);
      // This should fail because label is required and shouldn't be null
      await expect(schema.validate(config)).rejects.toThrow();
    });
  });

  describe('regression tests', () => {
    it('should not break existing configurations without description or placeholder', async () => {
      const legacyConfig = {
        metadatas: {
          title: {
            edit: {
              label: 'Title',
              editable: true,
              visible: true,
            },
            list: {
              label: 'Title',
              searchable: true,
              sortable: true,
            },
          },
        },
      };

      const schema = modelConfigurationValidation(mockSchema);
      await expect(schema.validate(legacyConfig)).resolves.toBeDefined();
    });

    it('should maintain compatibility with existing string values', async () => {
      const existingConfig = {
        metadatas: {
          title: {
            edit: {
              label: 'Title',
              description: 'Existing description',
              placeholder: 'Existing placeholder',
              editable: true,
              visible: true,
            },
          },
        },
      };

      const schema = modelConfigurationValidation(mockSchema);
      const result = await schema.validate(existingConfig);

      expect(result.metadatas.title.edit.description).toBe('Existing description');
      expect(result.metadatas.title.edit.placeholder).toBe('Existing placeholder');
    });
  });
});
