/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { ConfigureStoreOptions } from '@reduxjs/toolkit';
import { TestUtils } from '@strapi/admin/strapi-admin';

const { defaultTestStoreConfig, render: renderAdmin, server, waitFor, act, screen } = TestUtils;

import { PERMISSIONS } from '../src/constants';
import { releaseApi } from '../src/services/release';

const storeConfig: ConfigureStoreOptions = {
  preloadedState: defaultTestStoreConfig.preloadedState,
  reducer: {
    ...defaultTestStoreConfig.reducer,
    [releaseApi.reducerPath]: releaseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...defaultTestStoreConfig.middleware(getDefaultMiddleware),
    releaseApi.middleware,
  ],
};

const render = (
  ui: React.ReactElement,
  options: TestUtils.RenderOptions = {}
): ReturnType<typeof renderAdmin> =>
  renderAdmin(ui, {
    ...options,
    providerOptions: { storeConfig, permissions: Object.values(PERMISSIONS).flat() },
  });

export { render, waitFor, act, screen, server };
