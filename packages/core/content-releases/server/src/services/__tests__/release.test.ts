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
    it('updates the release', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
          update: jest.fn().mockReturnValue({ id: 1, name: 'Release name' }),
        },
      };
      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      };

      const release = await releaseService.update(1, mockReleaseArgs, { user: mockUser });

      expect(release).toEqual({ id: 1, name: 'Release name' });
    });

    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue(null),
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

    it('throws an error if the release is already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue({ id: 1, name: 'test', releasedAt: new Date() }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockReleaseArgs = {
        name: 'Release name',
      };

      expect(() => releaseService.update(1, mockReleaseArgs, { user: mockUser })).rejects.toThrow(
        'Release already published'
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

  describe('createAction', () => {
    it('creates an action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          create: jest.fn().mockReturnValue({
            type: 'publish',
            entry: { id: 1, contentType: 'api::contentType.contentType' },
          }),
          findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
        },
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            validateEntryContentType: jest.fn(),
            validateUniqueEntry: jest.fn(),
          }),
        }),
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockActionArgs = {
        type: 'publish' as const,
        entry: { id: 1, contentType: 'api::contentType.contentType' as const },
      };

      const action = await releaseService.createAction(1, mockActionArgs);

      expect(action).toEqual({
        type: 'publish',
        entry: { id: 1, contentType: 'api::contentType.contentType' },
      });
    });

    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue(null),
        },
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            validateEntryContentType: jest.fn(),
            validateUniqueEntry: jest.fn(),
          }),
        }),
      };
      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockActionArgs = {
        type: 'publish' as const,
        entry: { id: 1, contentType: 'api::contentType.contentType' as const },
      };

      expect(() => releaseService.createAction(1, mockActionArgs)).rejects.toThrow(
        'No release found for id 1'
      );
    });

    it('throws an error if the release is already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue({ id: 1, name: 'test', releasedAt: new Date() }),
        },
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            validateEntryContentType: jest.fn(),
            validateUniqueEntry: jest.fn(),
          }),
        }),
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const mockActionArgs = {
        type: 'publish' as const,
        entry: { id: 1, contentType: 'api::contentType.contentType' as const },
      };

      expect(() => releaseService.createAction(1, mockActionArgs)).rejects.toThrow(
        'Release already published'
      );
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

      const servicesMock = {
        'entity-manager': {
          publishMany: mockPublishMany,
          unpublishMany: mockUnpublishMany,
        },
        'populate-builder': () => ({
          default: jest.fn().mockReturnThis(),
          populateDeep: jest.fn().mockReturnThis(),
          build: jest.fn().mockReturnThis(),
        }),
      };

      const strapiMock = {
        ...baseStrapiMock,
        db: {
          transaction: jest.fn().mockImplementation((cb) => cb()),
        },
        plugin: jest.fn().mockReturnValue({
          service: jest
            .fn()
            .mockImplementation((service: 'entity-manager' | 'populate-builder') => {
              return servicesMock[service];
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
          findMany: jest.fn(),
          update: jest.fn().mockReturnValue({}),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      strapiMock.entityService.findMany.mockReturnValueOnce([
        {
          contentType: 'contentType',
          type: 'publish',
          entry: { id: 1 },
        },
      ]);
      strapiMock.entityService.findMany.mockReturnValueOnce([
        {
          contentType: 'contentType',
          type: 'unpublish',
          entry: { id: 2 },
        },
      ]);

      await releaseService.publish(1);

      expect(mockPublishMany).toHaveBeenCalledWith(
        [{ contentType: 'contentType', entry: { id: 1 }, type: 'publish' }],
        'contentType'
      );
      expect(mockUnpublishMany).toHaveBeenCalledWith(
        [{ contentType: 'contentType', entry: { id: 2 }, type: 'unpublish' }],
        'contentType'
      );
    });
  });

  describe('findManyWithContentTypeEntryAttached', () => {
    it('should format the return value correctly', async () => {
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
      const releases = await releaseService.findManyWithContentTypeEntryAttached(
        'api::contentType.contentType',
        1
      );

      expect(releases).toEqual([{ name: 'test release', action: { type: 'publish' } }]);
    });
  });

  describe('delete', () => {
    it('deletes the release', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        entityService: {
          findOne: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
          delete: jest.fn().mockReturnValue({ id: 1, name: 'test' }),
        },
        db: {
          transaction: jest.fn(),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const release = await releaseService.delete(1);

      expect(release).toEqual({ id: 1, name: 'test' });
    });

    it('throws an error if the release does not exist or was already published', () => {
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

  describe('groupActions', () => {
    it('should return the data grouped by contentType', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        plugin: jest.fn().mockReturnValue({
          service: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue([
              { name: 'English (en)', code: 'en' },
              { name: 'French (fr)', code: 'fr' },
            ]),
          }),
        }),
      };

      const mockActions = [
        {
          id: 1,
          contentType: 'api::contentTypeA.contentTypeA',
          locale: 'en',
          entry: { id: 1, name: 'test 1', publishedAt: '2021-01-01' },
        },
        {
          id: 2,
          contentType: 'api::contentTypeB.contentTypeB',
          locale: 'fr',
          entry: { id: 2, name: 'test 2', publishedAt: null },
        },
      ];

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      // Mock getContentTypesDataForActions inside the release service
      releaseService.getContentTypesDataForActions = jest.fn().mockReturnValue({
        'api::contentTypeA.contentTypeA': {
          mainField: 'name',
          displayName: 'contentTypeA',
        },
        'api::contentTypeB.contentTypeB': {
          mainField: 'name',
          displayName: 'contentTypeB',
        },
      });

      // @ts-expect-error ignore missing properties
      const groupedData = await releaseService.groupActions(mockActions, 'contentType');

      expect(groupedData).toEqual({
        contentTypeA: [
          {
            id: 1,
            contentType: {
              displayName: 'contentTypeA',
              mainFieldValue: 'test 1',
              uid: 'api::contentTypeA.contentTypeA',
            },
            locale: {
              code: 'en',
              name: 'English (en)',
            },
            entry: {
              id: 1,
              name: 'test 1',
              publishedAt: '2021-01-01',
            },
          },
        ],
        contentTypeB: [
          {
            id: 2,
            contentType: {
              displayName: 'contentTypeB',
              mainFieldValue: 'test 2',
              uid: 'api::contentTypeB.contentTypeB',
            },
            locale: {
              code: 'fr',
              name: 'French (fr)',
            },
            entry: {
              id: 2,
              name: 'test 2',
              publishedAt: null,
            },
          },
        ],
      });
    });
  });

  describe('deleteAction', () => {
    it('deletes the action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const release = await releaseService.deleteAction(1, 1);

      expect(release).toEqual({ id: 1, type: 'publish' });
    });

    it('throws an error if the release does not exist', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnValue(null),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.deleteAction(1, 1)).rejects.toThrow(
        'Action with id 1 not found in release with id 1 or it is already published'
      );
    });
  });

  describe('updateAction', () => {
    it('updates the action', async () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            update: jest.fn().mockReturnValue({ id: 1, type: 'publish' }),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      const release = await releaseService.updateAction(1, 1, { type: 'publish' });

      expect(release).toEqual({ id: 1, type: 'publish' });
    });

    it('throws an error if the release does not exist or was already published', () => {
      const strapiMock = {
        ...baseStrapiMock,
        db: {
          query: jest.fn().mockReturnValue({
            update: jest.fn().mockReturnValue(null),
          }),
        },
      };

      // @ts-expect-error Ignore missing properties
      const releaseService = createReleaseService({ strapi: strapiMock });

      expect(() => releaseService.updateAction(1, 1, { type: 'publish' })).rejects.toThrow(
        'Action with id 1 not found in release with id 1 or it is already published'
      );
    });
  });
});
