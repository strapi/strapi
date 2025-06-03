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
    ...options,
    providerOptions: { permissions: Object.values(PERMISSIONS).flat() },
  });

const renderHook: typeof renderHookAdmin = (hook, options) =>
  renderHookAdmin(hook, {
    ...options,
    providerOptions: { permissions: Object.values(PERMISSIONS).flat() },
  });

export { render, renderHook, waitFor, server, act, screen };
