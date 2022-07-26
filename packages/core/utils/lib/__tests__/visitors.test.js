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
      const remove = jest.fn();
      const set = jest.fn();
      const rrr = visitors.removeRestrictedRelations(auth);
      await rrr(
        {
          data,
          key: keyCreatedBy,
          attribute,
          schema: { options: { populateCreatorFields: true } },
        },
        { remove, set }
      );
      await rrr(
        {
          data,
          key: keyUpdatedBy,
          attribute,
          schema: { options: { populateCreatorFields: true } },
        },
        { remove, set }
      );
      expect(remove).toBeCalledTimes(0);
      expect(set).toBeCalledTimes(0);
    });
    test('removes creator relations with populateCreatorFields false', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const rrr = visitors.removeRestrictedRelations(auth);
      await rrr(
        {
          data,
          key: keyCreatedBy,
          attribute,
          schema: { options: { populateCreatorFields: false } },
        },
        { remove, set }
      );
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith(keyCreatedBy);

      remove.mockClear();
      await rrr(
        {
          data,
          key: keyUpdatedBy,
          attribute,
          schema: { options: { populateCreatorFields: false } },
        },
        { remove, set }
      );
      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith(keyUpdatedBy);

      expect(set).toBeCalledTimes(0);
    });
  });
});
