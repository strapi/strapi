import { installGraphqlExtension } from '../graphql';

type Resolver = (
  parent: unknown,
  args: Record<string, unknown>,
  context?: object
) => Promise<unknown>;

const file = { id: 7, documentId: 'qovkpekciob2wt8qyd51mg8k', name: 'image.jpg' };

describe('Upload GraphQL extension', () => {
  let mockDbFindOne: jest.Mock;
  let mockUploadService: {
    findOne: jest.Mock;
    updateFileInfo: jest.Mock;
    remove: jest.Mock;
    getNamePaths: jest.Mock;
  };
  let resolvers: Record<string, Resolver>;
  let isFolderCRUDEnabled: boolean;
  let model: { uid: string; attributes?: Record<string, { private?: boolean }> };
  let types: Array<{ name?: string; type?: string }>;

  const install = () => {
    mockDbFindOne = jest.fn();
    mockUploadService = {
      findOne: jest.fn(),
      updateFileInfo: jest.fn(),
      remove: jest.fn(),
      getNamePaths: jest.fn(),
    };
    resolvers = {};

    const nexus = {
      inputObjectType: jest.fn((config) => config),
      nonNull: jest.fn((type) => type),
      extendType: jest.fn((config) => {
        const register = (name: string, { resolve }: { resolve: Resolver }) => {
          resolvers[name] = resolve;
        };
        config.definition({ field: register, string: register });
        return config;
      }),
    };

    const graphqlServices: Record<string, unknown> = {
      extension: {
        shadowCRUD: () => ({
          isEnabled: () => isFolderCRUDEnabled,
          disableMutations: jest.fn(),
          field: () => ({ disable: jest.fn(), disableOutput: jest.fn() }),
        }),
        use(register: (ctx: { nexus: unknown }) => { types: typeof types }) {
          types = register({ nexus }).types;
        },
      },
      utils: { naming: { getTypeName: () => 'UploadFile' } },
    };

    const strapi = {
      getModel: jest.fn(() => model),
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
  };

  beforeEach(() => {
    isFolderCRUDEnabled = true;
    model = { uid: 'plugin::upload.file' };
    install();
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

  describe('UploadFolder.namePath', () => {
    it('loads the name paths of one request in a single batch', async () => {
      mockUploadService.getNamePaths.mockResolvedValue({
        '/1': '/Clients',
        '/1/2': '/Clients/Acme',
      });
      const context = {};

      const namePaths = await Promise.all([
        resolvers.namePath({ path: '/1' }, {}, context),
        resolvers.namePath({ path: '/1/2' }, {}, context),
      ]);

      expect(namePaths).toEqual(['/Clients', '/Clients/Acme']);
      expect(mockUploadService.getNamePaths).toHaveBeenCalledTimes(1);
      expect(mockUploadService.getNamePaths).toHaveBeenCalledWith(['/1', '/1/2']);
    });

    it('returns null for a folder without a path', async () => {
      expect(await resolvers.namePath({ path: null }, {}, {})).toBeNull();
      expect(mockUploadService.getNamePaths).not.toHaveBeenCalled();
    });

    it('leaves the folder type alone when its shadow CRUD is disabled', () => {
      isFolderCRUDEnabled = false;
      install();

      expect(types.map((type) => type.type ?? type.name)).toEqual(['FileInfoInput', 'Mutation']);
    });

    it('is not added when the folder name is private', () => {
      model = { uid: 'plugin::upload.folder', attributes: { name: { private: true } } };
      install();

      expect(types.map((type) => type.type ?? type.name)).toEqual(['FileInfoInput', 'Mutation']);
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
        string(name: string, field: Omit<Field, 'type' | 'args'>) {
          fields[name] = { type: 'String', args: {}, ...field };
        },
      });
      return { extend: config.type };
    },
  };

  return { nexus, fields, inputFields };
};

const setup = ({ shadowCRUD = true } = {}) => {
  const shadowCRUDs: Record<
    string,
    {
      isEnabled: jest.Mock;
      disable: jest.Mock;
      disableMutations: jest.Mock;
      field: jest.Mock;
      fields: Record<string, { disable: jest.Mock; disableOutput: jest.Mock }>;
    }
  > = {};
  const use = jest.fn();
  const extension = {
    shadowCRUD: jest.fn((uid: string) => {
      if (shadowCRUDs[uid] === undefined) {
        const fields: Record<string, { disable: jest.Mock; disableOutput: jest.Mock }> = {};
        shadowCRUDs[uid] = {
          isEnabled: jest.fn(() => true),
          disable: jest.fn(),
          disableMutations: jest.fn(),
          field: jest.fn((name: string) => {
            fields[name] ??= { disable: jest.fn(), disableOutput: jest.fn() };
            return fields[name];
          }),
          fields,
        };
      }
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

  test('keeps the folder CRUD read-only and disables the generated file mutations', () => {
    const { shadowCRUDs } = setup();
    const folder = shadowCRUDs['plugin::upload.folder'];

    expect(folder.disable).not.toHaveBeenCalled();
    expect(folder.disableMutations).toHaveBeenCalled();
    expect(folder.fields.files.disable).toHaveBeenCalled();
    expect(folder.fields.children.disableOutput).toHaveBeenCalled();
    expect(folder.fields.pathId.disableOutput).toHaveBeenCalled();
    expect(folder.fields.publishedAt.disable).toHaveBeenCalled();
    expect(shadowCRUDs['plugin::upload.file'].disableMutations).toHaveBeenCalled();
    expect(shadowCRUDs['plugin::upload.file'].disable).not.toHaveBeenCalled();
  });

  test('registers the file info input and the file mutations typed after the file model', () => {
    const { register } = setup();

    const { extensionConfig, fields, inputFields } = register();

    expect(extensionConfig.types).toEqual([
      { input: 'FileInfoInput' },
      { extend: 'plugin::upload.folder#type' },
      { extend: 'Mutation' },
    ]);
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
      'Query.uploadFolders': {
        auth: { scope: 'plugin::upload.folder.find' },
        middlewares: [expect.any(Function)],
      },
      'Query.uploadFolders_connection': {
        auth: { scope: 'plugin::upload.folder.find' },
        middlewares: [expect.any(Function)],
      },
      'Query.uploadFolder': { auth: { scope: 'plugin::upload.folder.findOne' } },
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
