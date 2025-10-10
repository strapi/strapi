import { errors } from '@strapi/utils';
import type { Common, EntityService } from '@strapi/types';

import entityValidator from '../..';
import { models, existentIDs, nonExistentIds } from './utils/relations.testdata';

/**
 * Test that relations can be successfully validated and non existent relations
 * can be detected at the Attribute level.
 */
describe('Entity validator | Relations | Attribute', () => {
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

  describe('Success', () => {
    const testData: Array<[string, EntityService.Params.Data.Input<Common.UID.ContentType>]> = [
      [
        'Connect',
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
      [
        'Set',
        {
          categories: {
            set: [
              {
                id: existentIDs[0],
              },
            ],
          },
        },
      ],
      [
        'Number',
        {
          categories: existentIDs[0],
        },
      ],
      [
        'Array',
        {
          categories: existentIDs.slice(-Math.floor(existentIDs.length / 2)),
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
    const expectError = new errors.ValidationError(
      `2 relation(s) of type api::category.category associated with this entity do not exist`
    );
    const testData: Array<[string, EntityService.Params.Data.Input<Common.UID.ContentType>]> = [
      [
        'Connect',
        {
          categories: {
            disconnect: [],
            connect: [existentIDs[0], ...nonExistentIds.slice(-2)].map((id) => ({
              id,
            })),
          },
        },
      ],
      [
        'Set',
        {
          categories: {
            set: [existentIDs[0], ...nonExistentIds.slice(-2)].map((id) => ({ id })),
          },
        },
      ],
      [
        'Number',
        {
          categories: nonExistentIds.slice(-2),
        },
      ],
    ];

    test.each(testData)('%s', async (__, input = {}) => {
      const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
        isDraft: true,
      });
      await expect(res).rejects.toThrowError(expectError);
    });
  });
});
