import { adminApi } from '@strapi/admin/strapi-admin';

import { initialState, reducer, setInitialData } from '../app';

describe('content-manager app state', () => {
  it('clears derived data when the admin API cache is reset', () => {
    const populatedState = reducer(
      undefined,
      setInitialData({
        adminUserId: 1,
        authorizedCollectionTypeLinks: [],
        authorizedSingleTypeLinks: [],
        components: [],
        contentTypeSchemas: [],
        fieldSizes: {},
      })
    );

    expect(populatedState.isLoading).toBe(false);
    expect(populatedState.adminUserId).toBe(1);

    expect(reducer(populatedState, adminApi.util.resetApiState())).toEqual(initialState);
  });
});
