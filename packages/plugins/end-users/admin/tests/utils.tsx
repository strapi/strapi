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

/**
 * Resolves once the mock server has answered the next request to `path`, and the page has had the
 * answer: for a test that asserts something is not shown, which passes before the request is
 * answered unless it waits for it. Call it before rendering.
 */
const answered = (path: string): (() => Promise<void>) => {
  let isAnswered: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    isAnswered = resolve;
  });
  const onResponse = ({ request }: { request: Request }) => {
    if (new URL(request.url).pathname === path) {
      server.events.removeListener('response:mocked', onResponse);
      isAnswered();
    }
  };

  server.events.on('response:mocked', onResponse);

  return async () => {
    await done;
    // The answer reaches the store, and the store reaches the page, in the turns that follow
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
  };
};

export { answered, render, renderHook, waitFor, server, act, screen };
