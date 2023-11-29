import releaseController from '../release';

const mockCountActions = jest.fn();

jest.mock('../../utils', () => ({
  getService: jest.fn(() => ({
    findOne: jest.fn(() => ({ id: 1 })),
    countActions: mockCountActions,
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
              total: 0,
              totalHidden: 0
            }
          },
          meta: {}
        }
      }
    };

    it('throws an error if the release does not exists', async () => {
      // @ts-expect-error partial context
      expect(() => releaseController.findOne(ctx).rejects.toThrow('Release not found for id: 1'));
    });

    it('return the right meta object', async () => {
      // We mock the count all actions
      mockCountActions.mockResolvedValueOnce(2);

      // We mock the count hidden actions
      mockCountActions.mockResolvedValueOnce(1);


      // @ts-expect-error partial context
      await releaseController.findOne(ctx);
      expect(ctx.body.data.meta).toEqual({
        contentTypes: {
          contentTypeA: {
            mainField: 'name'
          },
          contentTypeB: {
            mainField: 'name'
          }
        },
      });
      expect(ctx.body.data.actions.meta).toEqual({
        total: 2,
        totalHidden: 1,
      });
    });
  });
});
