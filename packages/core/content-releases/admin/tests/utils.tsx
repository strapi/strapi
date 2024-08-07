/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import {
  render as renderAdmin,
  server,
  waitFor,
  act,
  screen,
  type RenderOptions,
} from '@strapi/admin/strapi-admin/test';

import { PERMISSIONS, PERMISSIONS_SETTINGS } from '../src/constants';

const render = (
  ui: React.ReactElement,
  options: RenderOptions = {}
): ReturnType<typeof renderAdmin> =>
  renderAdmin(ui, {
    ...options,
    providerOptions: {
      permissions: Object.values({ ...PERMISSIONS, ...PERMISSIONS_SETTINGS }).flat(),
    },
  });

export { render, waitFor, act, screen, server };
