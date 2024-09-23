import * as visitors from '../sanitize/visitors';
import * as contentTypeUtils from '../content-types';

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

describe('Sanitize visitors util', () => {
  describe('removeRestrictedRelations', () => {
    const auth = {};
    const data = {};
    const creatorKeys = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE];
    const removeRestrictedRelationsFn = visitors.removeRestrictedRelations(auth);
    const attribute = {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
    };

    test('keeps creator relations with populateCreatorFields true', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const promises = creatorKeys.map(async (key) => {
        await removeRestrictedRelationsFn(
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

      expect(remove).toHaveBeenCalledTimes(0);
      expect(set).toBeCalledTimes(0);
    });

    test('removes creator relations with populateCreatorFields false', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const promises = creatorKeys.map(async (key) => {
        await removeRestrictedRelationsFn(
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

      expect(remove).toHaveBeenCalledTimes(creatorKeys.length);
      creatorKeys.forEach((key) => expect(remove).toHaveBeenCalledWith(key));
      expect(set).toBeCalledTimes(0);
    });
  });
});
