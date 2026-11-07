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

/**
 * `PERMISSIONS` is nested (`roles.read`, `conditions.update`, …): the test providers take the
 * flat list of every permission the signed-in admin holds.
 */
const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((group) => Object.values(group).flat());

const render = (
  ui: React.ReactElement,
  options: RenderOptions = {}
): ReturnType<typeof renderAdmin> =>
  renderAdmin(ui, {
    ...options,
    providerOptions: { permissions: ALL_PERMISSIONS },
  });

const renderHook: typeof renderHookAdmin = (hook, options) =>
  renderHookAdmin(hook, {
    ...options,
    providerOptions: { permissions: ALL_PERMISSIONS },
  });

export { render, renderHook, waitFor, server, act, screen };
