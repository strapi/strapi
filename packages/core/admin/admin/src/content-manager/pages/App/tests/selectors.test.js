import { fixtures } from '@strapi/admin-test-utils';
import { makeSelectModels } from '../selectors';

describe('Content Manager | App | selectors', () => {
  let store;

  beforeEach(() => {
    store = { ...fixtures.store.state };
  });

  describe('makeSelectModels', () => {
    it('should extract the models from the content manager state in the global store', () => {
      store['content-manager_app'] = {
        models: [{ uid: 'category' }, { uid: 'address' }],
      };

      const modelSelector = makeSelectModels();
      const actual = modelSelector(store);
      const expected = [{ uid: 'category' }, { uid: 'address' }];

      expect(actual).toEqual(expected);
    });
  });
});
