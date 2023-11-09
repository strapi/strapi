import { ENTITY_STAGE_ATTRIBUTE } from '../../constants/workflows';
import stages from '../workflows/stages';
import '@strapi/types';

describe('Stages', () => {
  const nonExistantEntityId = 1;
  const entityId = 2;

  const numberOfStages = 4;
  const entityStageId = 1;

  const readMock = jest.fn(() => false);

  global.strapi = {
    // @ts-expect-error - only defining the properties we need
    admin: {
      services: {
        'stage-permissions': {
          can: jest.fn(() => true),
        },
        workflows: {
          count() {
            return 1;
          },
          getAssignedWorkflow() {
            return {
              stages: Array.from({ length: numberOfStages }, (_, i) => ({ id: i + 1 })),
            };
          },
        },
      },
    },
    plugins: {
      'content-manager': {
        services: {
          'permission-checker': {
            create() {
              return {
                cannot: {
                  read: readMock,
                },
              };
            },
          },
        },
        // @ts-expect-error - only defining the properties we need
        service(name) {
          return this.services[name];
        },
      },
    },
    plugin(name) {
      return this.plugins[name];
    },
    entityService: {
      // @ts-expect-error - only defining the properties we need
      findOne: jest.fn((_, id) => {
        if (id === nonExistantEntityId) {
          return Promise.resolve(null);
        }

        return Promise.resolve({
          id: entityId,
          [ENTITY_STAGE_ATTRIBUTE]: { id: entityStageId },
        });
      }),
    },
  };

  const modelUID = 'UID';

  const baseCtx = {
    state: {
      userAbility: {},
    },
  };

  describe('listAvailableStages', () => {
    test('non existant entity', async () => {
      const ctx = {
        ...baseCtx,
        params: {
          model_uid: modelUID,
          id: nonExistantEntityId,
        },
        throw(status: any, message: any) {
          const error = new Error(message) as any;
          error.status = status;
          throw error;
        },
      } as any;

      let error: any;
      try {
        await stages.listAvailableStages(ctx);
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.status).toBe(404);
    });

    test('cannot transition', async () => {
      global.strapi.admin.services['stage-permissions'].can.mockReturnValueOnce(false);

      const ctx: any = {
        ...baseCtx,
        params: {
          model_uid: modelUID,
          id: entityId,
        },
      };

      await stages.listAvailableStages(ctx);

      expect(ctx.body.data.length).toBe(0);
    });

    test('cannot read', async () => {
      readMock.mockReturnValueOnce(true);

      const ctx = {
        ...baseCtx,
        params: {
          model_uid: modelUID,
          id: entityId,
        },
        forbidden() {
          const error = new Error() as any;
          error.status = 403;
          throw error;
        },
      } as any;

      let error: any;
      try {
        await stages.listAvailableStages(ctx);
      } catch (e) {
        error = e;
      }
      expect(error.status).toBe(403);
    });

    test('cannot transition', async () => {
      global.strapi.admin.services['stage-permissions'].can.mockReturnValueOnce(false);

      const ctx: any = {
        ...baseCtx,
        params: {
          model_uid: modelUID,
          id: entityId,
        },
      };

      await stages.listAvailableStages(ctx);

      expect(ctx.body.data.length).toBe(0);
    });

    test('can transition', async () => {
      const ctx: any = {
        ...baseCtx,
        params: {
          model_uid: modelUID,
          id: entityId,
        },
      };

      await stages.listAvailableStages(ctx);

      expect(ctx.body.data.length).toBe(numberOfStages - 1);
      expect(ctx.body.data).not.toContainEqual({ id: entityStageId });
    });
  });
});
