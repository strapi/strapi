import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { getAdminService, getService } from '..';

const createStrapi = (label: string) => {
  const plugin = { service: vi.fn((name: string) => ({ label, name })) };

  return {
    service: vi.fn((uid: string) => ({ label, uid })),
    plugin: vi.fn(() => plugin),
  } as unknown as Core.Strapi;
};

describe('review-workflows service getters', () => {
  const globalStrapi = global.strapi;

  afterEach(() => {
    global.strapi = globalStrapi;
  });

  test('getAdminService reads the admin service from the global Strapi instance', () => {
    global.strapi = createStrapi('global');

    expect(getAdminService('user')).toEqual({ label: 'global', uid: 'admin::user' });
  });

  test('getAdminService reads the admin service from the given Strapi instance', () => {
    global.strapi = createStrapi('global');

    expect(getAdminService('user', { strapi: createStrapi('given') })).toEqual({
      label: 'given',
      uid: 'admin::user',
    });
  });

  test('getService reads the plugin service from the global Strapi instance', () => {
    global.strapi = createStrapi('global');

    expect(getService('workflows')).toEqual({ label: 'global', name: 'workflows' });
    expect(global.strapi.plugin).toHaveBeenCalledWith('review-workflows');
  });

  test('getService reads the plugin service from the given Strapi instance', () => {
    global.strapi = createStrapi('global');

    expect(getService('stages', { strapi: createStrapi('given') })).toEqual({
      label: 'given',
      name: 'stages',
    });
  });
});
