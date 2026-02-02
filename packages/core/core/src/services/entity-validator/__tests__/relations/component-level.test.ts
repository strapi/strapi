import { errors } from '@strapi/utils';

import entityValidator from '../..';
import { models, existentIDs, nonExistentIds } from './utils/relations.testdata';

/**
 * Test that relations can be successfully validated and non existent relations
 * can be detected at the Component level.
 */
describe('Entity validator | Relations | Component Level', () => {
  global.strapi = {
    components: {
      'basic.dev-compo': {},
    },

    db: {
      query() {
        return {
          count: ({
            where: {
              id: { $in },
            },
          }: any) => existentIDs.filter((value) => $in.includes(value)).length,
        };
      },
    },

    errors: {
      badRequest: jest.fn(),
    },
    getModel: (uid: string) => models.get(uid),
  } as any;

  describe('Single Component', () => {
    describe('Success', () => {
      const testData = [
        [
          'Connect',
          {
            sCom: {
              categories: {
                disconnect: [],
                connect: [
                  {
                    id: existentIDs[0],
                  },
                ],
              },
            },
          },
        ],
        [
          'Set',
          {
            sCom: {
              categories: {
                set: [
                  {
                    id: existentIDs[0],
                  },
                ],
              },
            },
          },
        ],
        [
          'Number',
          {
            sCom: {
              categories: existentIDs[0],
            },
          },
        ],
        [
          'Array',
          {
            sCom: {
              categories: existentIDs.slice(-3),
            },
          },
        ],
      ];

      test.each(testData)('%s', async (__, input = {}) => {
        const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
          isDraft: true,
        });
        await expect(res).resolves.not.toThrowError();
      });
    });

    describe('Error', () => {
      const expectedError = new errors.ValidationError(
        `1 relation(s) of type api::category.category associated with this entity do not exist`
      );
      const testData = [
        [
          'Connect',
          {
            sCom: {
              categories: {
                disconnect: [],
                connect: [
                  {
                    id: nonExistentIds[0],
                  },
                ],
              },
            },
          },
        ],
        [
          'Set',
          {
            sCom: {
              categories: {
                set: [
                  {
                    id: nonExistentIds[0],
                  },
                ],
              },
            },
          },
        ],
        [
          'Number',
          {
            sCom: {
              categories: nonExistentIds[0],
            },
          },
        ],
        [
          'Array',
          {
            sCom: {
              categories: [nonExistentIds[0]],
            },
          },
        ],
      ];

      test.each(testData)('%s', async (__, input = {}) => {
        global.strapi = strapi;
        const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
          isDraft: true,
        });
        await expect(res).rejects.toThrowError(expectedError);
      });
    });
  });

  describe('Repeatable Component', () => {
    describe('Success', () => {
      const testData = [
        [
          'Connect',
          {
            rCom: [
              {
                categories: {
                  disconnect: [],
                  connect: [
                    {
                      id: existentIDs[0],
                    },
                  ],
                },
              },
            ],
          },
        ],
        [
          'Set',
          {
            rCom: [
              {
                categories: {
                  set: existentIDs.slice(-Math.floor(existentIDs.length / 2)).map((id) => ({
                    id,
                  })),
                },
              },
            ],
          },
        ],
        [
          'Number',
          {
            rCom: [
              {
                categories: existentIDs[0],
              },
            ],
          },
        ],
        [
          'Array',
          {
            rCom: [
              {
                categories: existentIDs.slice(-Math.floor(existentIDs.length / 2)),
              },
            ],
          },
        ],
      ];

      test.each(testData)('%s', async (__, input = {}) => {
        global.strapi = strapi;
        const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
          isDraft: true,
        });
        await expect(res).resolves.not.toThrowError();
      });
    });

    describe('Error', () => {
      const expectedError = new errors.ValidationError(
        `4 relation(s) of type api::category.category associated with this entity do not exist`
      );
      const testData = [
        [
          'Connect',
          {
            rCom: [
              {
                categories: {
                  disconnect: [],
                  connect: [existentIDs[0], ...nonExistentIds.slice(-4)].map((id) => ({
                    id,
                  })),
                },
              },
            ],
          },
        ],
        [
          'Set',
          {
            rCom: [
              {
                categories: {
                  set: [existentIDs[0], ...nonExistentIds.slice(-4)].map((id) => ({
                    id,
                  })),
                },
              },
            ],
          },
        ],
        [
          'Array',
          {
            rCom: [
              {
                categories: nonExistentIds.slice(-4),
              },
            ],
          },
        ],
      ];

      test.each(testData)('%s', async (__, input = {}) => {
        const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
          isDraft: true,
        });
        await expect(res).rejects.toThrowError(expectedError);
      });
    });
  });
});
