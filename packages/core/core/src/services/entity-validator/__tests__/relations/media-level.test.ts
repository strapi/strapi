import { errors } from '@strapi/utils';

import entityValidator from '../..';
import { models, existentIDs, nonExistentIds } from './utils/relations.testdata';

/**
 * Test that relations can be successfully validated and non existent relations
 * can be detected at the Media level.
 */
describe('Entity validator | Relations | Media', () => {
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

  it('Success', async () => {
    const input = {
      media: [
        {
          id: existentIDs[0],
          name: 'img.jpeg',
        },
      ],
    };

    const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
      isDraft: true,
    });
    await expect(res).resolves.not.toThrowError();
  });

  it('Error', async () => {
    const expectedError = new errors.ValidationError(
      `1 relation(s) of type plugin::upload.file associated with this entity do not exist`
    );
    const input = {
      media: [
        {
          id: nonExistentIds[0],
          name: 'img.jpeg',
        },
        {
          id: existentIDs[0],
          name: 'img.jpeg',
        },
      ],
    };

    const res = entityValidator.validateEntityCreation(models.get('api::dev.dev'), input, {
      isDraft: true,
    });
    await expect(res).rejects.toThrowError(expectedError);
  });
});
