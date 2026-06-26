jest.mock(
  '@strapi/utils',
  () => {
    const chain = {
      shape: jest.fn(() => chain),
      integer: jest.fn(() => chain),
      min: jest.fn(() => chain),
      max: jest.fn(() => chain),
      required: jest.fn(() => chain),
      nullable: jest.fn(() => chain),
      oneOf: jest.fn(() => chain),
      matches: jest.fn(() => chain),
      of: jest.fn(() => chain),
      test: jest.fn(() => chain),
      uniqueProperty: jest.fn(() => chain),
    };

    const yup = {
      object: jest.fn(() => chain),
      number: jest.fn(() => chain),
      string: jest.fn(() => chain),
      array: jest.fn(() => chain),
    };

    return {
      async: {
        map: async (items: unknown[], mapper: (item: unknown) => unknown) =>
          Promise.all(items.map(mapper)),
      },
      yup,
      validateYupSchema: jest.fn(() => async (value: unknown) => value),
    };
  },
  { virtual: true }
);

import stagesController from '../stages';
import { getService } from '../../utils';

jest.mock('../../utils', () => ({
  getService: jest.fn(),
}));

const mockedGetService = getService as jest.Mock;

describe('review-workflows stages controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listAvailableStages', () => {
    test('returns workflow metadata instead of 404 when the localized entity does not exist yet', async () => {
      const workflowStages = [
        { id: 1, name: 'Draft' },
        { id: 2, name: 'Review' },
      ];

      const stagePermissions = {
        can: jest.fn(),
      };
      const workflowService = {
        count: jest.fn().mockResolvedValue(1),
        getAssignedWorkflow: jest.fn().mockResolvedValue({ stages: workflowStages }),
      };

      mockedGetService.mockImplementation((name: string) => {
        if (name === 'stage-permissions') {
          return stagePermissions;
        }

        if (name === 'workflows') {
          return workflowService;
        }

        throw new Error(`Unexpected service: ${name}`);
      });

      (global as any).strapi = {
        plugins: {
          'content-manager': {
            services: {
              'permission-checker': {
                create: jest.fn(() => ({
                  cannot: {
                    read: jest.fn(() => false),
                  },
                })),
              },
            },
          },
        },
        apis: {},
        admin: { services: {} },
        documents: jest.fn(() => ({
          findOne: jest.fn().mockResolvedValue(null),
        })),
      } as any;

      const ctx = {
        params: {
          model_uid: 'api::article.article',
          id: 'document-id',
        },
        request: {
          query: {
            locale: 'pt-BR',
          },
        },
        state: {
          userAbility: {},
        },
        forbidden: jest.fn(),
        throw: jest.fn((status, message) => {
          throw new Error(`${status}: ${message}`);
        }),
      } as any;

      await stagesController.listAvailableStages(ctx);

      expect(ctx.throw).not.toHaveBeenCalled();
      expect(stagePermissions.can).not.toHaveBeenCalled();
      expect(ctx.body).toEqual({
        data: [],
        meta: {
          stageCount: workflowStages.length,
          workflowCount: 1,
          canTransition: false,
        },
      });
    });
  });
});
