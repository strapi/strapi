import releaseController from '../release';

const mockFindPage = jest.fn();
const mockFindManyWithContentTypeEntryAttached = jest.fn();
const mockFindManyWithoutContentTypeEntryAttached = jest.fn();
const mockCountActions = jest.fn();
const mockCountNotReadyByRelease = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    findOne: jest.fn(() => ({ id: 1, createdBy: { firstname: 'test' } })),
    findPage: mockFindPage,
    findManyWithContentTypeEntryAttached: mockFindManyWithContentTypeEntryAttached,
    findManyWithoutContentTypeEntryAttached: mockFindManyWithoutContentTypeEntryAttached,
    countActions: mockCountActions,
    countNotReadyByRelease: mockCountNotReadyByRelease,
    getContentTypesDataForActions: jest.fn(),
  })),
  getAllowedContentTypes: jest.fn(() => ['contentTypeA', 'contentTypeB']),
}));

describe('Release controller', () => {
  describe('findPage', () => {
    it('should call findPage', async () => {
      mockFindPage.mockResolvedValue({
        results: [
          { id: 1, releasedAt: null, actions: { count: 3 } },
          { id: 2, releasedAt: '2026-10-01T00:00:00.000Z', actions: { count: 4 } },
        ],
        pagination: {},
      });
      mockCountNotReadyByRelease.mockResolvedValue(new Map([[1, 2]]));
      mockFindManyWithContentTypeEntryAttached.mockResolvedValue([]);
      const userAbility = {
        can: jest.fn(),
      };
      const ctx = {
        state: {
          userAbility: {},
        },
        query: {
          page: 1,
          pageSize: 10,
        },
      };
      global.strapi = {
        admin: {
          services: {
            permission: {
              createPermissionsManager: jest.fn(() => ({
                ability: userAbility,
                validateQuery: jest.fn(),
                sanitizeQuery: jest.fn(() => ctx.query),
              })),
            },
          },
        },
        db: {
          query: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue(2),
          }),
        },
      } as any;

      // @ts-expect-error partial context
      await releaseController.findPage(ctx);

      expect(mockFindPage).toHaveBeenCalled();
      expect(mockCountNotReadyByRelease).toHaveBeenCalledWith([1]);
      // @ts-expect-error the context gets a body
      expect(ctx.body.data.map(({ actions }) => actions.meta)).toEqual([
        { count: 3, notReadyCount: 2 },
        { count: 4 },
      ]);
    });
  });
  describe('create', () => {
    it('throws an error given bad request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {},
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseController.create(ctx)).rejects.toThrow('name is a required field');
    });
  });

  describe('update', () => {
    it('throws an error given bad request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {
            name: '',
          },
        },
        params: {
          id: 1,
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseController.update(ctx)).rejects.toThrow('name is a required field');
    });

    it('throws an error given unknown request arguments', () => {
      const ctx = {
        state: {
          user: {},
        },
        // Mock missing name on request
        request: {
          body: {
            name: 'Test',
            unknown: '',
          },
        },
        params: {
          id: 1,
        },
      };

      // @ts-expect-error partial context
      expect(() => releaseController.update(ctx)).rejects.toThrow(
        'this field has unspecified keys: unknown'
      );
    });
  });

  describe('findOne', () => {
    beforeAll(() => {
      global.strapi = {
        ...global.strapi,
        admin: {
          services: {
            user: {
              sanitizeUser: jest.fn(),
            },
          },
        },
        plugins: {
          'content-manager': {
            services: {
              'content-types': {
                findAllContentTypes: jest
                  .fn()
                  .mockReturnValue([
                    { uid: 'api::contentTypeA.contentTypeA' },
                    { uid: 'api::contentTypeB.contentTypeB' },
                  ]),
              },
              components: {
                findAllComponents: jest.fn().mockReturnValue([{ uid: 'component.component' }]),
              },
            },
          },
        },
      } as any;
    });

    it('throws an error if the release does not exists', async () => {
      const ctx = {
        state: {
          userAbility: {
            can: jest.fn(() => true),
          },
        },
        params: {
          id: 1,
        },
        user: {},
        body: {
          data: {
            actions: {
              meta: {
                count: 0,
              },
            },
            meta: {},
          },
        },
      };
      // @ts-expect-error partial context
      expect(() => releaseController.findOne(ctx).rejects.toThrow('Release not found for id: 1'));
    });

    it('should have a body with meta including actions count', async () => {
      const ctx = {
        state: {
          userAbility: {
            can: jest.fn(() => true),
          },
        },
        params: {
          id: 1,
        },
        user: {},
        body: {
          data: {
            actions: {
              meta: {
                count: 0,
              },
            },
            meta: {},
          },
        },
      };
      mockCountActions.mockResolvedValueOnce(2);
      // The release is planned: one of its publish actions isn't publishable
      mockCountNotReadyByRelease.mockResolvedValueOnce(new Map([[1, 1]]));

      // @ts-expect-error partial context
      await releaseController.findOne(ctx);
      expect(ctx.body.data.actions.meta).toEqual({
        count: 2,
        notReadyCount: 1,
      });
    });

    it('should call sanitize user', async () => {
      const ctx = {
        state: {
          userAbility: {
            can: jest.fn(() => true),
          },
        },
        params: {
          id: 1,
        },
        user: {},
      };

      mockCountNotReadyByRelease.mockResolvedValueOnce(new Map());

      // @ts-expect-error partial context
      await releaseController.findOne(ctx);
      expect(strapi.service('admin::user').sanitizeUser).toHaveBeenCalled();
    });
  });

  describe.skip('mapEntriesToReleases', () => {
    it('should throw an error if contentTypeUid or entriesIds are missing', async () => {
      const ctx = {
        query: {},
      };

      // @ts-expect-error partial context
      await expect(() => releaseController.mapEntriesToReleases(ctx)).rejects.toThrow(
        'Missing required query parameters'
      );
    });

    it('should call findManyWithContentTypeEntryAttached with correct parameters', async () => {
      const ctx = {
        query: {
          contentTypeUid: 'api::kitchensink.kitchensink',
          entriesIds: [1, 2, 3],
        },
      };

      const mockRelease = {
        id: 1,
        name: 'Test Release',
        actions: [
          {
            entry: {
              id: 1,
            },
          },
        ],
      };

      mockFindManyWithContentTypeEntryAttached.mockResolvedValue([mockRelease]);

      // @ts-expect-error partial context
      await releaseController.mapEntriesToReleases(ctx);

      expect(mockFindManyWithContentTypeEntryAttached).toHaveBeenCalledWith(
        'api::kitchensink.kitchensink',
        [1, 2, 3]
      );
    });

    it('should map entries to releases correctly', async () => {
      const ctx = {
        query: {
          contentTypeUid: 'api::kitchensink.kitchensink',
          entriesIds: [1, 2, 3],
        },
        body: { data: {} },
      };

      const mockRelease = {
        id: 1,
        name: 'Test Release',
        actions: [
          {
            entry: {
              id: 1,
            },
          },
          {
            entry: {
              id: 2,
            },
          },
        ],
      };

      mockFindManyWithContentTypeEntryAttached.mockResolvedValue([mockRelease]);

      // @ts-expect-error partial context
      await releaseController.mapEntriesToReleases(ctx);

      expect(ctx.body.data).toEqual({
        1: [{ id: 1, name: 'Test Release' }],
        2: [{ id: 1, name: 'Test Release' }],
      });
    });
  });
});
