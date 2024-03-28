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
  renderHook,
} from '@strapi/admin/strapi-admin/test';

const storeConfig: ConfigureStoreOptions = {
  preloadedState: defaultTestStoreConfig.preloadedState,
  reducer: {
    ...defaultTestStoreConfig.reducer,
  },
  middleware: (getDefaultMiddleware) => [
    ...defaultTestStoreConfig.middleware(getDefaultMiddleware),
  ],
};

const render = (
  ui: React.ReactElement,
  options: RenderOptions = {}
): ReturnType<typeof renderAdmin> =>
  renderAdmin(ui, {
    ...options,
    providerOptions: { storeConfig },
  });

export { renderHook, render, waitFor, act, screen, server };
