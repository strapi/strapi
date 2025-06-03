import * as visitors from '../validate/visitors';
import * as contentTypeUtils from '../content-types';
import { ValidationError } from '../errors';

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

describe('Validate visitors util', () => {
  describe('throwRestrictedRelations', () => {
    const auth = {};
    const data = {};
    const creatorKeys = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE];
    const throwRestrictedRelationsFn = visitors.throwRestrictedRelations(auth);
    const attribute = {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
    };

    test('keeps creator relations with populateCreatorFields true', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const promises = creatorKeys.map(async (key) => {
        await throwRestrictedRelationsFn(
          {
            data,
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {},
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });
      await Promise.all(promises);
    });

    test('throws on creator relations with populateCreatorFields false', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      expect(async () => {
        const promises = creatorKeys.map(async (key) => {
          await throwRestrictedRelationsFn(
            {
              data,
              key,
              attribute,
              schema: {
                kind: 'collectionType',
                info: {
                  singularName: 'test',
                  pluralName: 'tests',
                },
                options: { populateCreatorFields: false },
                attributes: {},
              },
              value: {},
              path: {
                attribute: null,
                raw: null,
              },
            },
            { remove, set }
          );
        });

        await Promise.all(promises);
      }).rejects.toThrowError(ValidationError);
    });
  });
});
