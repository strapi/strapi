/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import {
  renderHook as renderHookAdmin,
  render as renderAdmin,
  waitFor,
  act,
  screen,
  type RenderOptions,
} from '@strapi/admin/strapi-admin/test';

import { PERMISSIONS } from '../src/constants';

import { server } from './server';

const render = (
  ui: React.ReactElement,
  options: RenderOptions = {}
): ReturnType<typeof renderAdmin> =>
  renderAdmin(ui, {
    providerOptions: { permissions: Object.values(PERMISSIONS).flat() },
    ...options,
  });

const renderHook: typeof renderHookAdmin = (hook, options) =>
  renderHookAdmin(hook, {
    providerOptions: { permissions: Object.values(PERMISSIONS).flat() },
    ...options,
  });

export { render, renderHook, waitFor, server, act, screen };
