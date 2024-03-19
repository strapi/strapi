/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { ConfigureStoreOptions } from '@reduxjs/toolkit';
import { TestUtils } from '@strapi/admin/strapi-admin';

const {
  renderHook: renderHookAdmin,
  render: renderAdmin,
  defaultTestStoreConfig,
  waitFor,
  act,
  screen,
} = TestUtils;

import { PERMISSIONS } from '../src/constants';
import { i18nApi } from '../src/services/api';

import { server } from './server';

const storeConfig: ConfigureStoreOptions = {
  preloadedState: defaultTestStoreConfig.preloadedState,
  reducer: {
    ...defaultTestStoreConfig.reducer,
    [i18nApi.reducerPath]: i18nApi.reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...defaultTestStoreConfig.middleware(getDefaultMiddleware),
    i18nApi.middleware,
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

const renderHook: typeof renderHookAdmin = (hook, options) =>
  renderHookAdmin(hook, {
    ...options,
    providerOptions: { storeConfig, permissions: Object.values(PERMISSIONS).flat() },
  });

export { render, renderHook, waitFor, server, act, screen };
