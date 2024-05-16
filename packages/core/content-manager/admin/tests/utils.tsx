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
  renderHook as renderHookAdmin,
  type RenderOptions,
  fireEvent,
} from '@strapi/admin/strapi-admin/test';

import { reducer } from '../src/modules/reducers';
import { contentManagerApi } from '../src/services/api';

const storeConfig: ConfigureStoreOptions = {
  preloadedState: defaultTestStoreConfig.preloadedState,
  reducer: {
    ...defaultTestStoreConfig.reducer,
    [contentManagerApi.reducerPath]: contentManagerApi.reducer,
    'content-manager': reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...defaultTestStoreConfig.middleware(getDefaultMiddleware),
    contentManagerApi.middleware,
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

export { fireEvent, render, waitFor, act, screen, server, renderHook };
export type { RenderOptions };
