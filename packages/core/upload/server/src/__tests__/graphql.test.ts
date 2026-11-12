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

  beforeEach(() => {
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
          disableMutations: jest.fn(),
          field: () => ({ disable: jest.fn(), disableOutput: jest.fn() }),
        }),
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
  });
});
