'use strict';

const visitors = require('../sanitize/visitors');

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = require('../content-types').constants;

describe('Sanitize visitors util', () => {
  describe('removeRestrictedRelations', () => {
    const auth = {};
    const data = {};
    const keyCreatedBy = CREATED_BY_ATTRIBUTE;
    const keyUpdatedBy = UPDATED_BY_ATTRIBUTE;

    const attribute = {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
    };

    test('keeps creator relations with populateCreatorFields true', async () => {
      const populateCreatorFields = true;
      const creatorKeys = [keyCreatedBy, keyUpdatedBy];
      const remove = jest.fn();
      const set = jest.fn();
      const rrr = visitors.removeRestrictedRelations(auth);
      const promises = creatorKeys.map(async key => {
        await rrr(
          {
            data,
            key,
            attribute,
            schema: { options: { populateCreatorFields } },
          },
          { remove, set }
        );
      });
      await Promise.all(promises);

      expect(remove).toHaveBeenCalledTimes(0);
      expect(set).toBeCalledTimes(0);
    });
    test('removes creator relations with populateCreatorFields false', async () => {
      const populateCreatorFields = false;
      const creatorKeys = [keyCreatedBy, keyUpdatedBy];
      const remove = jest.fn();
      const set = jest.fn();
      const rrr = visitors.removeRestrictedRelations(auth);
      const promises = creatorKeys.map(async key => {
        await rrr(
          {
            data,
            key,
            attribute,
            schema: { options: { populateCreatorFields } },
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
