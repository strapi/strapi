/* eslint-disable check-file/filename-naming-convention */
import { ConfigureStoreOptions } from '@reduxjs/toolkit';
import {
  act,
  defaultTestStoreConfig,
  renderHook,
  server,
  waitFor,
} from '@strapi/admin/strapi-admin/test';
import { http, HttpResponse } from 'msw';

import { establishAdminSession } from '../../../../../admin/admin/src/utils/establishAdminSession';
import { useTypedDispatch } from '../../modules/hooks';
import { reducer } from '../../modules/reducers';
import { useContentManagerInitData } from '../useContentManagerInitData';

const createContentTypes = () => [
  {
    uid: 'api::perf-a.perf-a',
    isDisplayed: true,
    apiID: 'perf-a',
    kind: 'collectionType',
    info: { displayName: 'Perf A' },
  },
  {
    uid: 'api::perf-b.perf-b',
    isDisplayed: true,
    apiID: 'perf-b',
    kind: 'collectionType',
    info: { displayName: 'Perf B' },
  },
  {
    uid: 'api::perf-c.perf-c',
    isDisplayed: true,
    apiID: 'perf-c',
    kind: 'collectionType',
    info: { displayName: 'Perf C' },
  },
];

const createStoreConfig = (): ConfigureStoreOptions => {
  const testStoreConfig = defaultTestStoreConfig();

  return {
    preloadedState: testStoreConfig.preloadedState,
    reducer: {
      ...testStoreConfig.reducer,
      'content-manager': reducer,
    },
    middleware: (getDefaultMiddleware) => [...testStoreConfig.middleware(getDefaultMiddleware)],
  };
};

describe('useContentManagerInitData', () => {
  it('hides the previous admin links until the new session permissions are resolved', async () => {
    const tokenA = 'content-manager-user-a';
    const tokenB = 'content-manager-user-b';
    const contentTypes = createContentTypes().slice(0, 2);
    let initRequests = 0;
    let releaseSecondInit: () => void = () => {};
    const secondInitGate = new Promise<void>((resolve) => {
      releaseSecondInit = resolve;
    });

    window.localStorage.setItem('jwtToken', JSON.stringify(tokenA));
    window.localStorage.setItem('isLoggedIn', 'true');

    server.use(
      http.get('/admin/users/me', ({ request }) => {
        const isUserB = request.headers.get('Authorization') === `Bearer ${tokenB}`;

        return HttpResponse.json({
          data: {
            id: isUserB ? 2 : 1,
            email: isUserB ? 'user-b@example.com' : 'user-a@example.com',
            firstname: isUserB ? 'User B' : 'User A',
            lastname: 'Admin',
            username: isUserB ? 'user-b' : 'user-a',
            preferedLanguage: 'en',
            roles: [{ id: isUserB ? 2 : 1 }],
          },
        });
      }),
      http.get('/admin/users/me/permissions', ({ request }) => {
        const isUserB = request.headers.get('Authorization') === `Bearer ${tokenB}`;
        const contentType = isUserB ? contentTypes[1] : contentTypes[0];

        return HttpResponse.json({
          data: [
            {
              id: isUserB ? 2 : 1,
              action: 'plugin::content-manager.explorer.read',
              actionParameters: {},
              subject: contentType.uid,
              properties: {},
              conditions: [],
            },
          ],
        });
      }),
      http.get('/content-manager/init', async () => {
        initRequests += 1;
        if (initRequests > 1) {
          await secondInitGate;
        }

        return HttpResponse.json({
          data: {
            components: [],
            contentTypes,
            fieldSizes: {},
          },
        });
      }),
      http.get('/content-manager/content-types-settings', () =>
        HttpResponse.json({
          data: [],
        })
      )
    );

    const { result } = renderHook(
      () => {
        const dispatch = useTypedDispatch();

        return {
          data: useContentManagerInitData(),
          switchSession: () =>
            establishAdminSession(dispatch, {
              token: tokenB,
              persist: true,
            }),
        };
      },
      {
        providerOptions: {
          storeConfig: createStoreConfig(),
          permissions: [],
        },
      }
    );

    await waitFor(() =>
      expect(result.current.data.collectionTypeLinks.map(({ uid }) => uid)).toEqual([
        contentTypes[0].uid,
      ])
    );

    act(() => {
      result.current.switchSession();
    });

    await waitFor(() => expect(initRequests).toBe(2));
    expect(result.current.data.isLoading).toBe(true);
    expect(result.current.data.collectionTypeLinks).toEqual([]);

    releaseSecondInit();

    await waitFor(() =>
      expect(result.current.data.collectionTypeLinks.map(({ uid }) => uid)).toEqual([
        contentTypes[1].uid,
      ])
    );

    window.localStorage.clear();
  });

  it('batches conditional permission checks for visible content types', async () => {
    let permissionCheckCalls = 0;
    const contentTypes = createContentTypes();

    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({
          data: {
            components: [],
            contentTypes,
            fieldSizes: {},
          },
        })
      ),
      http.get('/content-manager/content-types-settings', () =>
        HttpResponse.json({
          data: [],
        })
      ),
      http.post<Record<string, never>, { permissions: Array<{ action: string }> }>(
        '/admin/permissions/check',
        async ({ request }) => {
          permissionCheckCalls += 1;

          const { permissions } = await request.json();

          return HttpResponse.json({
            data: permissions.map(() => true),
          });
        }
      )
    );

    const permissions = contentTypes.map((contentType, index) => ({
      id: index + 1,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: contentType.uid,
      properties: {},
      conditions: ['admin::is-creator'],
    }));

    const { result } = renderHook(() => useContentManagerInitData(), {
      providerOptions: {
        storeConfig: createStoreConfig(),
        permissions,
      },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.collectionTypeLinks).toHaveLength(contentTypes.length);
    expect(permissionCheckCalls).toBe(1);
  });

  it('only includes the content types that pass the batched permission check', async () => {
    let permissionCheckCalls = 0;
    const contentTypes = createContentTypes();

    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({
          data: {
            components: [],
            contentTypes,
            fieldSizes: {},
          },
        })
      ),
      http.get('/content-manager/content-types-settings', () =>
        HttpResponse.json({
          data: [],
        })
      ),
      http.post<Record<string, never>, { permissions: Array<{ subject: string }> }>(
        '/admin/permissions/check',
        async ({ request }) => {
          permissionCheckCalls += 1;

          const { permissions } = await request.json();

          return HttpResponse.json({
            data: permissions.map(({ subject }) => subject !== 'api::perf-b.perf-b'),
          });
        }
      )
    );

    const permissions = contentTypes.map((contentType, index) => ({
      id: index + 1,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: contentType.uid,
      properties: {},
      conditions: ['admin::is-creator'],
    }));

    const { result } = renderHook(() => useContentManagerInitData(), {
      providerOptions: {
        storeConfig: createStoreConfig(),
        permissions,
      },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.collectionTypeLinks.map(({ uid }) => uid)).toEqual([
      'api::perf-a.perf-a',
      'api::perf-c.perf-c',
    ]);
    expect(permissionCheckCalls).toBe(1);
  });

  it('handles permission check API failures without populating links', async () => {
    let permissionCheckCalls = 0;
    const contentTypes = createContentTypes();

    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({
          data: {
            components: [],
            contentTypes,
            fieldSizes: {},
          },
        })
      ),
      http.get('/content-manager/content-types-settings', () =>
        HttpResponse.json({
          data: [],
        })
      ),
      http.post('/admin/permissions/check', async () => {
        permissionCheckCalls += 1;

        return HttpResponse.json({ error: { message: 'boom' } }, { status: 500 });
      })
    );

    const permissions = contentTypes.map((contentType, index) => ({
      id: index + 1,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: contentType.uid,
      properties: {},
      conditions: ['admin::is-creator'],
    }));

    const { result } = renderHook(() => useContentManagerInitData(), {
      providerOptions: {
        storeConfig: createStoreConfig(),
        permissions,
      },
    });

    await waitFor(() => expect(permissionCheckCalls).toBe(1));

    expect(result.current.collectionTypeLinks).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('does not call the permission check API for unconditional permissions', async () => {
    let permissionCheckCalls = 0;
    const contentTypes = createContentTypes();

    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({
          data: {
            components: [],
            contentTypes,
            fieldSizes: {},
          },
        })
      ),
      http.get('/content-manager/content-types-settings', () =>
        HttpResponse.json({
          data: [],
        })
      ),
      http.post('/admin/permissions/check', async () => {
        permissionCheckCalls += 1;

        return HttpResponse.json({
          data: [],
        });
      })
    );

    const permissions = contentTypes.map((contentType, index) => ({
      id: index + 1,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: contentType.uid,
      properties: {},
      conditions: [],
    }));

    const { result } = renderHook(() => useContentManagerInitData(), {
      providerOptions: {
        storeConfig: createStoreConfig(),
        permissions,
      },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.collectionTypeLinks).toHaveLength(contentTypes.length);
    expect(permissionCheckCalls).toBe(0);
  });

  it('forwards the contentStructure from the init payload into state', async () => {
    const contentTypes = createContentTypes();
    const contentStructure = {
      collectionTypes: [
        {
          type: 'group',
          id: 'grp-1',
          name: 'Group 1',
          children: [{ type: 'contentType', uid: 'api::perf-a.perf-a' }],
        },
      ],
      singleTypes: [],
    };

    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({
          data: { components: [], contentTypes, fieldSizes: {}, contentStructure },
        })
      ),
      http.get('/content-manager/content-types-settings', () => HttpResponse.json({ data: [] })),
      http.post('/admin/permissions/check', async () => HttpResponse.json({ data: [] }))
    );

    const permissions = contentTypes.map((contentType, index) => ({
      id: index + 1,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: contentType.uid,
      properties: {},
      conditions: [],
    }));

    const { result } = renderHook(() => useContentManagerInitData(), {
      providerOptions: { storeConfig: createStoreConfig(), permissions },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.contentStructure).toEqual(contentStructure);
  });

  it('leaves contentStructure undefined when the init payload omits it', async () => {
    const contentTypes = createContentTypes();

    server.use(
      http.get('/content-manager/init', () =>
        HttpResponse.json({ data: { components: [], contentTypes, fieldSizes: {} } })
      ),
      http.get('/content-manager/content-types-settings', () => HttpResponse.json({ data: [] })),
      http.post('/admin/permissions/check', async () => HttpResponse.json({ data: [] }))
    );

    const permissions = contentTypes.map((contentType, index) => ({
      id: index + 1,
      action: 'plugin::content-manager.explorer.read',
      actionParameters: {},
      subject: contentType.uid,
      properties: {},
      conditions: [],
    }));

    const { result } = renderHook(() => useContentManagerInitData(), {
      providerOptions: { storeConfig: createStoreConfig(), permissions },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Backwards compatibility: An older server omits contentStructure completely, but links still populate.
    expect(result.current.contentStructure).toBeUndefined();
    expect(result.current.collectionTypeLinks).toHaveLength(contentTypes.length);
  });
});
