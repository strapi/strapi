'use strict';

const visitors = require('../sanitize/visitors');

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = require('../content-types').constants;

describe('Sanitize visitors util', () => {
  describe('removeRestrictedRelations', () => {
    const auth = {};
    const data = {};
    const creatorKeys = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE];
    const rrrFunction = visitors.removeRestrictedRelations(auth);
    const attribute = {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
    };

    test('keeps creator relations with populateCreatorFields true', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const promises = creatorKeys.map(async key => {
        await rrrFunction(
          {
            data,
            key,
            attribute,
            schema: { options: { populateCreatorFields: true } },
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
      const promises = creatorKeys.map(async key => {
        await rrrFunction(
          {
            data,
            key,
            attribute,
            schema: { options: { populateCreatorFields: false } },
          },
          { remove, set }
        );
      });
      await Promise.all(promises);

      expect(remove).toHaveBeenCalledTimes(creatorKeys.length);
      creatorKeys.forEach(key => expect(remove).toHaveBeenCalledWith(key));
      expect(set).toBeCalledTimes(0);
    });
  });
});
