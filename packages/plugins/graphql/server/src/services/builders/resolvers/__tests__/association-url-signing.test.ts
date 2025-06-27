import associationResolverFactory from '../association';

describe('GraphQL Association Resolver | URL Signing', () => {
  let associationResolver: any;
  let mockSignEntityMedia: jest.Mock;
  let mockDbQuery: jest.Mock;
  let mockLoad: jest.Mock;
  let mockGetGraphQLService: jest.Mock;

  const mockContentType = {
    uid: 'api::article.article',
    attributes: {
      image: {
        type: 'media',
        multiple: false,
      },
      gallery: {
        type: 'media',
        multiple: true,
      },
      author: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::author.author',
      },
    },
  };

  const mockTargetContentType = {
    uid: 'plugin::upload.file',
    attributes: {},
  };

  const mockFile = {
    id: 1,
    url: 'original-url.jpg',
    provider: 'aws-s3',
  };

  const mockSignedFile = {
    id: 1,
    url: 'signed-url.jpg',
    provider: 'aws-s3',
    isUrlSigned: true,
  };

  beforeEach(() => {
    mockSignEntityMedia = jest.fn();
    mockLoad = jest.fn();
    mockDbQuery = jest.fn().mockReturnValue({ load: mockLoad });

    mockGetGraphQLService = jest.fn().mockImplementation((serviceName: string) => {
      if (serviceName === 'utils') {
        return {
          attributes: {
            isMorphRelation: jest.fn().mockReturnValue(false),
            isMedia: jest.fn().mockReturnValue(true),
          },
        };
      }
      if (serviceName === 'builders') {
        return {
          utils: {
            transformArgs: jest.fn().mockReturnValue({}),
          },
        };
      }
      if (serviceName === 'format') {
        return {
          returnTypes: {
            toEntityResponse: jest.fn().mockImplementation((data) => ({ data })),
            toEntityResponseCollection: jest.fn().mockImplementation((data) => ({ data })),
          },
        };
      }
      return {};
    });

    global.strapi = {
      plugins: {
        graphql: {
          service: mockGetGraphQLService,
          services: {
            utils: {
              attributes: {
                isMorphRelation: jest.fn().mockReturnValue(false),
                isMedia: jest.fn().mockReturnValue(true),
              },
            },
            builders: {
              utils: {
                transformArgs: jest.fn().mockReturnValue({}),
              },
            },
            format: {
              returnTypes: {
                toEntityResponse: jest.fn().mockImplementation((data) => ({ data })),
                toEntityResponseCollection: jest.fn().mockImplementation((data) => ({ data })),
              },
            },
          },
        },
        upload: {
          service: jest.fn().mockImplementation((serviceName: string) => {
            if (serviceName === 'extensions.utils') {
              return { signEntityMedia: mockSignEntityMedia };
            }
            return {};
          }),
          services: {
            'extensions.utils': { signEntityMedia: mockSignEntityMedia },
          },
        },
      },
      plugin: jest.fn().mockImplementation((pluginName: string) => {
        if (pluginName === 'graphql') {
          return { service: mockGetGraphQLService };
        }
        if (pluginName === 'upload') {
          return {
            service: jest.fn().mockImplementation((serviceName: string) => {
              if (serviceName === 'extensions.utils') {
                return { signEntityMedia: mockSignEntityMedia };
              }
              return {};
            }),
          };
        }
        return null;
      }),
      getModel: jest.fn().mockImplementation((uid: string) => {
        if (uid === 'api::article.article') return mockContentType;
        if (uid === 'plugin::upload.file') return mockTargetContentType;
        return null;
      }),
      db: {
        query: mockDbQuery,
      },
      contentAPI: {
        validate: {
          query: jest.fn().mockResolvedValue(undefined),
        },
        sanitize: {
          query: jest.fn().mockResolvedValue({}),
          output: jest.fn().mockImplementation((data) => data),
        },
      },
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'query-params') {
          return { transform: jest.fn().mockReturnValue({}) };
        }
        return undefined;
      }),
    } as any;

    associationResolver = associationResolverFactory({
      strapi: global.strapi,
      registry: {} as any,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildAssociationResolver', () => {
    describe('single media attribute', () => {
      it('should sign URLs for single media files', async () => {
        mockLoad.mockResolvedValue(mockFile);
        mockSignEntityMedia.mockResolvedValue(mockSignedFile);

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'image',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        const result = await resolver(parent, {}, context);

        expect(mockLoad).toHaveBeenCalledWith(parent, 'image', expect.any(Object));
        expect(mockSignEntityMedia).toHaveBeenCalledWith(mockFile, 'plugin::upload.file');
        expect(result.data).toEqual(mockSignedFile);
      });

      it('should handle null results without signing', async () => {
        mockLoad.mockResolvedValue(null);

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'image',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        const result = await resolver(parent, {}, context);

        expect(mockLoad).toHaveBeenCalled();
        expect(mockSignEntityMedia).not.toHaveBeenCalled();
        expect(result.data).toBeNull();
      });
    });

    describe('multiple media attribute', () => {
      beforeEach(() => {
        // Mock isMedia to return true and indicate multiple files
        mockGetGraphQLService.mockImplementation((serviceName: string) => {
          if (serviceName === 'utils') {
            return {
              attributes: {
                isMorphRelation: jest.fn().mockReturnValue(false),
                isMedia: jest.fn().mockImplementation((attr) => attr.type === 'media'),
              },
            };
          }
          if (serviceName === 'builders') {
            return {
              utils: {
                transformArgs: jest.fn().mockReturnValue({}),
              },
            };
          }
          if (serviceName === 'format') {
            return {
              returnTypes: {
                toEntityResponse: jest.fn().mockImplementation((data) => ({ data })),
                toEntityResponseCollection: jest.fn().mockImplementation((data) => ({ data })),
              },
            };
          }
          return {};
        });

        // Update content type for gallery attribute
        global.strapi.getModel = jest.fn().mockImplementation((uid: string) => {
          if (uid === 'api::article.article') {
            return {
              ...mockContentType,
              attributes: {
                ...mockContentType.attributes,
                gallery: {
                  type: 'media',
                  multiple: true,
                },
              },
            };
          }
          if (uid === 'plugin::upload.file') return mockTargetContentType;
          return null;
        });
      });

      it('should sign URLs for multiple media files', async () => {
        const mockFiles = [
          { id: 1, url: 'file1.jpg' },
          { id: 2, url: 'file2.jpg' },
        ];
        const mockSignedFiles = [
          { id: 1, url: 'signed-file1.jpg', isUrlSigned: true },
          { id: 2, url: 'signed-file2.jpg', isUrlSigned: true },
        ];

        mockLoad.mockResolvedValue(mockFiles);
        mockSignEntityMedia
          .mockResolvedValueOnce(mockSignedFiles[0])
          .mockResolvedValueOnce(mockSignedFiles[1]);

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'gallery',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        const result = await resolver(parent, {}, context);

        expect(mockLoad).toHaveBeenCalledWith(parent, 'gallery', expect.any(Object));
        expect(mockSignEntityMedia).toHaveBeenCalledTimes(2);
        expect(mockSignEntityMedia).toHaveBeenNthCalledWith(1, mockFiles[0], 'plugin::upload.file');
        expect(mockSignEntityMedia).toHaveBeenNthCalledWith(2, mockFiles[1], 'plugin::upload.file');
        expect(result.data).toEqual(mockSignedFiles);
      });

      it('should handle empty arrays without signing', async () => {
        mockLoad.mockResolvedValue([]);

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'gallery',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        const result = await resolver(parent, {}, context);

        expect(mockLoad).toHaveBeenCalled();
        expect(mockSignEntityMedia).not.toHaveBeenCalled();
        expect(result.data).toEqual([]);
      });
    });

    describe('when upload plugin is not available', () => {
      beforeEach(() => {
        global.strapi.plugin = jest.fn().mockImplementation((pluginName: string) => {
          if (pluginName === 'graphql') {
            return { service: mockGetGraphQLService };
          }
          if (pluginName === 'upload') {
            return null; // Upload plugin not available
          }
          return null;
        });
      });

      it('should return original data without signing', async () => {
        mockLoad.mockResolvedValue(mockFile);

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'image',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        const result = await resolver(parent, {}, context);

        expect(mockLoad).toHaveBeenCalled();
        expect(mockSignEntityMedia).not.toHaveBeenCalled();
        expect(result.data).toEqual(mockFile);
      });
    });

    describe('error handling', () => {
      it('should handle signing errors gracefully', async () => {
        mockLoad.mockResolvedValue(mockFile);
        mockSignEntityMedia.mockRejectedValue(new Error('Signing failed'));

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'image',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        await expect(resolver(parent, {}, context)).rejects.toThrow('Signing failed');
      });

      it('should handle database load errors', async () => {
        mockLoad.mockRejectedValue(new Error('Database error'));

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'image',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        await expect(resolver(parent, {}, context)).rejects.toThrow('Database error');
      });
    });

    describe('polymorphic associations', () => {
      beforeEach(() => {
        mockGetGraphQLService.mockImplementation((serviceName: string) => {
          if (serviceName === 'utils') {
            return {
              attributes: {
                isMorphRelation: jest.fn().mockReturnValue(true),
                isMedia: jest.fn().mockReturnValue(false),
              },
            };
          }
          if (serviceName === 'builders') {
            return {
              utils: {
                transformArgs: jest.fn().mockReturnValue({}),
              },
            };
          }
          if (serviceName === 'format') {
            return {
              returnTypes: {
                toEntityResponse: jest.fn().mockImplementation((data) => ({ data })),
                toEntityResponseCollection: jest.fn().mockImplementation((data) => ({ data })),
              },
            };
          }
          return {};
        });
      });

      it('should sign URLs for polymorphic associations', async () => {
        // Add the morphRelation attribute to the content type
        global.strapi.getModel = jest.fn().mockImplementation((uid: string) => {
          if (uid === 'api::article.article') {
            return {
              ...mockContentType,
              attributes: {
                ...mockContentType.attributes,
                morphRelation: {
                  type: 'relation',
                  relation: 'morphToMany',
                  target: 'plugin::upload.file',
                },
              },
            };
          }
          if (uid === 'plugin::upload.file') return mockTargetContentType;
          return null;
        });

        mockLoad.mockResolvedValue(mockFile);
        mockSignEntityMedia.mockResolvedValue(mockSignedFile);

        const resolver = associationResolver.buildAssociationResolver({
          contentTypeUID: 'api::article.article',
          attributeName: 'morphRelation',
        });

        const parent = { id: 1 };
        const context = { state: { auth: {} } };

        await resolver(parent, {}, context);

        expect(mockLoad).toHaveBeenCalled();
        expect(mockSignEntityMedia).toHaveBeenCalledWith(mockFile, 'plugin::upload.file');
      });
    });
  });
});
