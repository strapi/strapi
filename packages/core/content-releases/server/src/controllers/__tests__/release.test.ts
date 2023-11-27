import releaseController from '../release';

const mockFindOne = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    findOne: mockFindOne
  })),
  getAllowedContentTypes: jest.fn(() => ['contentTypeA', 'contentTypeB']),
}));

describe('Release controller', () => {
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
            name: ''
          },
        },
        params: {
          id: 1
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
            unknown: ''
          },
        },
        params: {
          id: 1
        },
      };
  
      // @ts-expect-error partial context
      expect(() => releaseController.update(ctx)).rejects.toThrow('this field has unspecified keys: unknown');
    });
  });

  describe('findOne', () => {
    global.strapi = {
      ...global.strapi,
      plugins: {
        // @ts-expect-error incomplete plugin
        'content-manager': {
          services: {
            'content-types': {
              findConfiguration: () => ({
                settings: {
                  mainField: 'name'
                }
              })
            }
          }
        },
      }
    };

    const ctx = {
      state: {
        userAbility: {
          can: jest.fn(() => true)
        }
      },
      params: {
        id: 1
      },
      user: {},
      body: {
        data: {
          actions: {
            meta: {
              count: 0
            }
          }
        }
      }
    };

    it('throws an error if the release does not exists', async () => {
      // @ts-expect-error partial context
      expect(() => releaseController.findOne(ctx).rejects.toThrow('Release not found for id: 1'));
    });

    it('return the right meta object', async () => {
      // We mock the count all actions
      mockFindOne.mockResolvedValueOnce({
        actions: {
          count: 2
        }
      });

      // We mock the count hidden actions
      mockFindOne.mockResolvedValueOnce({
        actions: {
          count: 1
        }
      });


      // @ts-expect-error partial context
      await releaseController.findOne(ctx);
      expect(ctx.body.data.actions.meta).toEqual({
        contentTypes: {
          contentTypeA: {
            mainField: 'name'
          },
          contentTypeB: {
            mainField: 'name'
          }
        },
        total: 2,
        totalHidden: 1,
      });
    });
  });
});
