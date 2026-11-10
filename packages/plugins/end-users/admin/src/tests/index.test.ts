import plugin from '../index';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

describe('the plugin registration', () => {
  it('lists the settings links in the order the design gives', () => {
    const links: Array<{ id: string }> = [];
    const app = {
      addSettingsLink: (_section: unknown, items: Array<{ id: string }>) => links.push(...items),
      registerPlugin: jest.fn(),
    } as unknown as StrapiApp;

    plugin.register(app);

    expect(links.map(({ id }) => id)).toEqual([
      'roles',
      'sign-in',
      'providers',
      'email-templates',
      'conditions',
      'advanced',
    ]);
  });
});
