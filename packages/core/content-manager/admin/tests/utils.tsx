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

const storeConfig = (): ConfigureStoreOptions => {
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

const render = (
  ui: React.ReactElement,
  options: RenderOptions = {}
): ReturnType<typeof renderAdmin> =>
  renderAdmin(ui, {
    ...options,
    providerOptions: { storeConfig: storeConfig() },
  });

const renderHook: typeof renderHookAdmin = (hook, options) =>
  renderHookAdmin(hook, {
    ...options,
    providerOptions: { storeConfig: storeConfig() },
  });

export { fireEvent, render, waitFor, act, screen, server, renderHook };
export type { RenderOptions };
