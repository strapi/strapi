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
