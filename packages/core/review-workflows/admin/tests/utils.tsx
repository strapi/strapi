/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { ConfigureStoreOptions } from '@reduxjs/toolkit';
import {
  defaultTestStoreConfig,
  render as renderAdmin,
  server,
  waitFor,
  act,
  screen,
  type RenderOptions,
  renderHook as renderHookAdmin,
} from '@strapi/admin/strapi-admin/test';

import { reviewWorkflowsApi } from '../src/services/api';

const storeConfig: ConfigureStoreOptions = {
  preloadedState: defaultTestStoreConfig.preloadedState,
  reducer: {
    ...defaultTestStoreConfig.reducer,
    [reviewWorkflowsApi.reducerPath]: reviewWorkflowsApi.reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...defaultTestStoreConfig.middleware(getDefaultMiddleware),
    reviewWorkflowsApi.middleware,
  ],
};

const render = (
  ui: React.ReactElement<any>,
  options: RenderOptions = {}
): ReturnType<typeof renderAdmin> =>
  renderAdmin(ui, {
    ...options,
    providerOptions: { storeConfig },
  });

const renderHook: typeof renderHookAdmin = (hook, options) =>
  renderHookAdmin(hook, {
    ...options,
    providerOptions: { storeConfig },
  });

export { renderHook, render, waitFor, act, screen, server };
