import { installGraphqlExtension } from '../graphql';

type Resolver = (parent: unknown, args: Record<string, unknown>) => Promise<unknown>;

const file = { id: 7, documentId: 'qovkpekciob2wt8qyd51mg8k', name: 'image.jpg' };

describe('Upload GraphQL extension', () => {
  let mockDbFindOne: jest.Mock;
  let mockUploadService: { findOne: jest.Mock; updateFileInfo: jest.Mock; remove: jest.Mock };
  let resolvers: Record<string, Resolver>;

  beforeEach(() => {
    mockDbFindOne = jest.fn();
    mockUploadService = {
      findOne: jest.fn(),
      updateFileInfo: jest.fn(),
      remove: jest.fn(),
    };
    resolvers = {};

    const nexus = {
      inputObjectType: jest.fn((config) => config),
      nonNull: jest.fn((type) => type),
      extendType: jest.fn((config) => {
        config.definition({
          field(name: string, { resolve }: { resolve: Resolver }) {
            resolvers[name] = resolve;
          },
        });
        return config;
      }),
    };

    const graphqlServices: Record<string, unknown> = {
      extension: {
        shadowCRUD: () => ({ disable: jest.fn(), disableMutations: jest.fn() }),
        use: (register: (ctx: { nexus: unknown }) => unknown) => register({ nexus }),
      },
      utils: { naming: { getTypeName: () => 'UploadFile' } },
    };

    const strapi = {
      getModel: jest.fn().mockReturnValue({ uid: 'plugin::upload.file' }),
      db: { query: jest.fn().mockReturnValue({ findOne: mockDbFindOne }) },
      plugin(name: string) {
        if (name === 'graphql') {
          return {
            service: (serviceName: string) => graphqlServices[serviceName],
            config: () => true,
          };
        }
        return { service: () => mockUploadService };
      },
    };

    installGraphqlExtension({ strapi: strapi as any });
  });

  describe('updateUploadFile', () => {
    const info = { name: 'new name' };

    it('passes a numeric id straight to the service without a documentId lookup', async () => {
      mockUploadService.updateFileInfo.mockResolvedValue(file);

      const result = await resolvers.updateUploadFile(null, { id: '7', info });

      expect(mockDbFindOne).not.toHaveBeenCalled();
      expect(mockUploadService.updateFileInfo).toHaveBeenCalledWith('7', info);
      expect(result).toEqual(file);
    });

    it('resolves a documentId to the numeric id', async () => {
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.updateFileInfo.mockResolvedValue(file);

      const result = await resolvers.updateUploadFile(null, { id: file.documentId, info });

      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: file.documentId },
        select: ['id'],
      });
      expect(mockUploadService.updateFileInfo).toHaveBeenCalledWith(file.id, info);
      expect(result).toEqual(file);
    });

    it('throws NotFoundError for an unknown documentId', async () => {
      mockDbFindOne.mockResolvedValue(null);

      await expect(
        resolvers.updateUploadFile(null, { id: 'unknowndocumentid0000000', info })
      ).rejects.toMatchObject({ name: 'NotFoundError' });
      expect(mockUploadService.updateFileInfo).not.toHaveBeenCalled();
    });
  });

  describe('deleteUploadFile', () => {
    it('passes a numeric id straight to the service without a documentId lookup', async () => {
      mockUploadService.findOne.mockResolvedValue(file);
      mockUploadService.remove.mockResolvedValue(file);

      const result = await resolvers.deleteUploadFile(null, { id: '7' });

      expect(mockDbFindOne).not.toHaveBeenCalled();
      expect(mockUploadService.findOne).toHaveBeenCalledWith('7');
      expect(mockUploadService.remove).toHaveBeenCalledWith(file);
      expect(result).toEqual(file);
    });

    it('resolves a documentId to the numeric id and removes the file', async () => {
      mockDbFindOne.mockResolvedValue({ id: file.id });
      mockUploadService.findOne.mockResolvedValue(file);
      mockUploadService.remove.mockResolvedValue(file);

      const result = await resolvers.deleteUploadFile(null, { id: file.documentId });

      expect(mockDbFindOne).toHaveBeenCalledWith({
        where: { documentId: file.documentId },
        select: ['id'],
      });
      expect(mockUploadService.findOne).toHaveBeenCalledWith(file.id);
      expect(mockUploadService.remove).toHaveBeenCalledWith(file);
      expect(result).toEqual(file);
    });

    it('returns null for an unknown documentId and removes nothing', async () => {
      mockDbFindOne.mockResolvedValue(null);

      const result = await resolvers.deleteUploadFile(null, { id: 'unknowndocumentid0000000' });

      expect(result).toBeNull();
      expect(mockUploadService.findOne).not.toHaveBeenCalled();
      expect(mockUploadService.remove).not.toHaveBeenCalled();
    });

    it('returns null for an unknown numeric id', async () => {
      mockUploadService.findOne.mockResolvedValue(null);

      const result = await resolvers.deleteUploadFile(null, { id: '404' });

      expect(result).toBeNull();
      expect(mockUploadService.remove).not.toHaveBeenCalled();
    });
  });
});

type Field = {
  type: unknown;
  args: Record<string, unknown>;
  resolve(parent: unknown, args: Record<string, unknown>): Promise<unknown>;
};

/** Records the nexus definitions an extension registers, as `{ name: definition }`. */
const createNexus = () => {
  const fields: Record<string, Field> = {};
  const inputFields: string[] = [];
  const nexus = {
    nonNull: (type: unknown) => ({ nonNull: type }),
    inputObjectType(config: { name: string; definition(t: unknown): void }) {
      config.definition({ string: (name: string) => inputFields.push(name) });
      return { input: config.name };
    },
    extendType(config: { type: string; definition(t: unknown): void }) {
      config.definition({
        field(name: string, field: Field) {
          fields[name] = field;
        },
      });
      return { extend: config.type };
    },
  };

  return { nexus, fields, inputFields };
};

const setup = ({ shadowCRUD = true } = {}) => {
  const shadowCRUDs: Record<string, { disable: jest.Mock; disableMutations: jest.Mock }> = {};
  const use = jest.fn();
  const extension = {
    shadowCRUD: jest.fn((uid: string) => {
      shadowCRUDs[uid] ??= { disable: jest.fn(), disableMutations: jest.fn() };
      return shadowCRUDs[uid];
    }),
    use,
  };
  const uploadService = {
    updateFileInfo: jest.fn(async (id: number, info: object) => ({ id, ...info })),
    findOne: jest.fn(),
    remove: jest.fn(async (file: object) => ({ ...file, removed: true })),
  };
  const graphQLServices: Record<string, unknown> = {
    extension,
    utils: { naming: { getTypeName: (model: { uid: string }) => `${model.uid}#type` } },
  };
  const plugins: Record<string, unknown> = {
    graphql: {
      service: (name: string) => graphQLServices[name],
      config: (key: string, defaultValue: unknown) =>
        key === 'shadowCRUD' ? shadowCRUD : defaultValue,
    },
    upload: { service: (name: string) => (name === 'upload' ? uploadService : undefined) },
  };
  const strapi = {
    plugin: (name: string) => plugins[name],
    getModel: (uid: string) => ({ uid }),
  };

  installGraphqlExtension({ strapi } as any);

  const register = () => {
    const { nexus, fields, inputFields } = createNexus();
    const extensionConfig = use.mock.calls[0][0]({ nexus });
    return { extensionConfig, fields, inputFields };
  };

  return { extension, shadowCRUDs, use, uploadService, register };
};

describe('upload GraphQL extension', () => {
  test('does nothing when the GraphQL shadow CRUD is disabled', () => {
    const { extension } = setup({ shadowCRUD: false });

    expect(extension.shadowCRUD).not.toHaveBeenCalled();
    expect(extension.use).not.toHaveBeenCalled();
  });

  test('disables the folder CRUD and the generated file mutations', () => {
    const { shadowCRUDs } = setup();

    expect(shadowCRUDs['plugin::upload.folder'].disable).toHaveBeenCalled();
    expect(shadowCRUDs['plugin::upload.file'].disableMutations).toHaveBeenCalled();
    expect(shadowCRUDs['plugin::upload.file'].disable).not.toHaveBeenCalled();
  });

  test('registers the file info input and the file mutations typed after the file model', () => {
    const { register } = setup();

    const { extensionConfig, fields, inputFields } = register();

    expect(extensionConfig.types).toEqual([{ input: 'FileInfoInput' }, { extend: 'Mutation' }]);
    expect(inputFields).toEqual(['name', 'alternativeText', 'caption']);
    expect(fields.updateUploadFile.type).toEqual({ nonNull: 'plugin::upload.file#type' });
    expect(fields.deleteUploadFile.type).toBe('plugin::upload.file#type');
  });

  test('scopes the file queries and mutations to the upload content API actions', () => {
    const { register } = setup();

    expect(register().extensionConfig.resolversConfig).toEqual({
      'Query.uploadFiles': { auth: { scope: 'plugin::upload.content-api.find' } },
      'Query.uploadFiles_connection': { auth: { scope: 'plugin::upload.content-api.find' } },
      'Query.uploadFile': { auth: { scope: 'plugin::upload.content-api.findOne' } },
      'Mutation.updateUploadFile': { auth: { scope: 'plugin::upload.content-api.upload' } },
      'Mutation.deleteUploadFile': { auth: { scope: 'plugin::upload.content-api.destroy' } },
    });
  });

  test('updateUploadFile updates the file info through the upload service', async () => {
    const { register, uploadService } = setup();
    const { fields } = register();

    await expect(
      fields.updateUploadFile.resolve(null, { id: 1, info: { name: 'cover' } })
    ).resolves.toEqual({ id: 1, name: 'cover' });
    expect(uploadService.updateFileInfo).toHaveBeenCalledWith(1, { name: 'cover' });
  });

  test('deleteUploadFile removes the file it finds', async () => {
    const { register, uploadService } = setup();
    uploadService.findOne.mockResolvedValue({ id: 1 });
    const { fields } = register();

    await expect(fields.deleteUploadFile.resolve(null, { id: 1 })).resolves.toEqual({
      id: 1,
      removed: true,
    });
  });

  test('deleteUploadFile resolves to null for a missing file', async () => {
    const { register, uploadService } = setup();
    uploadService.findOne.mockResolvedValue(null);
    const { fields } = register();

    await expect(fields.deleteUploadFile.resolve(null, { id: 1 })).resolves.toBeNull();
    expect(uploadService.remove).not.toHaveBeenCalled();
  });
});
