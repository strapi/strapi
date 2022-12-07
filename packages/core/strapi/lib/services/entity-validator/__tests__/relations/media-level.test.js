'use strict';

const { ValidationError } = require('@strapi/utils').errors;

const entityValidator = require('../..');
const { models, existentIDs, nonExistentIds } = require('./utils/relations.testdata');

/**
 * Test that relations can be successfully validated and non existent relations
 * can be detected at the Media level.
 */
describe('Entity validator | Relations | Media', () => {
  const strapi = {
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
          }) => existentIDs.filter((value) => $in.includes(value)).length,
        };
      },
    },
    errors: {
      badRequest: jest.fn(),
    },
    getModel: (uid) => models.get(uid),
  };

  it('Success', async () => {
    global.strapi = strapi;
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
    global.strapi = strapi;
    const expectedError = new ValidationError(
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
