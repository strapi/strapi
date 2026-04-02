/* eslint-disable check-file/filename-naming-convention */
import { ConfigureStoreOptions } from '@reduxjs/toolkit';
import {
  defaultTestStoreConfig,
  renderHook,
  server,
  waitFor,
} from '@strapi/admin/strapi-admin/test';
import { rest } from 'msw';

import { reducer } from '../../modules/reducers';
import { useContentManagerInitData } from '../useContentManagerInitData';

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
  it('batches conditional permission checks for visible content types', async () => {
    let permissionCheckCalls = 0;

    const contentTypes = [
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

    server.use(
      rest.get('/content-manager/init', (_req, res, ctx) =>
        res(
          ctx.json({
            data: {
              components: [],
              contentTypes,
              fieldSizes: {},
            },
          })
        )
      ),
      rest.get('/content-manager/content-types-settings', (_req, res, ctx) =>
        res(
          ctx.json({
            data: [],
          })
        )
      ),
      rest.post('/admin/permissions/check', async (req, res, ctx) => {
        permissionCheckCalls += 1;

        const { permissions } = await req.json<{ permissions: Array<{ action: string }> }>();

        return res(
          ctx.json({
            data: permissions.map(() => true),
          })
        );
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

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.collectionTypeLinks).toHaveLength(contentTypes.length);
    expect(permissionCheckCalls).toBe(1);
  });
});
