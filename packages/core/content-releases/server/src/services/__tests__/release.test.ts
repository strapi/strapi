import createReleaseService from '../release';

const baseStrapiMock = {
  utils: {
    errors: {
      ValidationError: jest.fn(),
    },
  },
};

const mockUser = {
  id: 1,
  username: 'user',
  email: 'user@strapi.io',
  firstname: 'John',
  isActive: true,
  blocked: false,
  preferedLanguage: 'en',
  roles: [],
  createdAt: '01/01/1900',
  updatedAt: '01/01/1900',
};

describe('release service', () => {
  describe('update', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          update: jest.fn().mockReturnValue(null),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      };

      expect(() => releaseService.update(1, mockReleaseArgs, { user: mockUser })).rejects.toThrow(
        'No release found for id 1'
      );
    });
  });

  describe('findActions', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue(null),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() =>
        releaseService.findActions(1, ['api::contentType.contentType'], {})
      ).rejects.toThrow('No release found for id 1');
    });
  });

  describe('publish', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue(null),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.publish(1)).rejects.toThrow('No release found for id 1');
    });

    it('throws an error if the release is already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue({ releasedAt: new Date() }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.publish(1)).rejects.toThrow('Release already published');
    });

    it('throws an error if the release have 0 actions', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue({ releasedAt: null, actions: [] }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.publish(1)).rejects.toThrow('No entries to publish');
    });

    it('calls publishMany for each contentType with the right actions', async () => {
      const mockPublishMany = jest.fn();
      const mockUnpublishMany = jest.fn();

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          transaction: jest.fn().mockImplementation((cb) => cb()),
        },
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            publishMany: mockPublishMany,
            unpublishMany: mockUnpublishMany,
          }),
        }),
        entityService: {
          findOne: jest.fn().mockReturnValue({
            releasedAt: null,
            actions: [
              {
                contentType: 'contentType',
                type: 'publish',
                entry: { id: 1 },
              },
              {
                contentType: 'contentType',
                type: 'unpublish',
                entry: { id: 2 },
              },
            ],
          }),
          update: jest.fn().mockReturnValue({}),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      await releaseService.publish(1);

      expect(mockPublishMany).toHaveBeenCalledWith([{ id: 1 }], 'contentType');
      expect(mockUnpublishMany).toHaveBeenCalledWith([{ id: 2 }], 'contentType');
    });
  });

  describe('findManyForContentTypeEntry', () => {
    it('should format the return value correctly when hasEntryAttached is true', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn(() => ({
            findMany: jest
              .fn()
              .mockReturnValue([{ name: 'test release', actions: [{ type: 'publish' }] }]),
          })),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });
      const releases = await releaseService.findManyForContentTypeEntry(
        'api::contentType.contentType',
        1,
        {
          hasEntryAttached: true,
        }
      );

      expect(releases).toEqual([{ name: 'test release', action: { type: 'publish' } }]);
    });
  });

  describe('delete', () => {
    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue(null),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.delete(1)).rejects.toThrow('No release found for id 1');
    });

    it('throws an error if the release is already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue({ releasedAt: new Date() }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.delete(1)).rejects.toThrow('Release already published');
    });
  });
});
