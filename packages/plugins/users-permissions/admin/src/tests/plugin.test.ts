import { describe, expect, it, vi } from 'vitest';

import plugin from '../index';
import { ProtectedAdvancedSettingsPage } from '../pages/AdvancedSettings/AdvancedSettings';
import { ProtectedEmailTemplatesPage } from '../pages/EmailTemplates/EmailTemplates';
import { ProtectedProvidersPage } from '../pages/Providers/Providers';
import { Roles } from '../pages/Roles/Roles';
import english from '../translations/en.json';

import type { StrapiApp } from '@strapi/strapi/admin';

describe('admin plugin registration', () => {
  it('registers the plugin and resolves every lazy settings page', async () => {
    const createSettingSection = vi.fn<StrapiApp['createSettingSection']>();
    const registerPlugin = vi.fn<StrapiApp['registerPlugin']>();
    plugin.register({ createSettingSection, registerPlugin });

    expect(registerPlugin).toHaveBeenCalledWith({
      id: 'users-permissions',
      name: 'users-permissions',
    });
    const [, links] = createSettingSection.mock.calls[0];
    expect(links.map((link) => link.id)).toEqual([
      'roles',
      'providers',
      'email-templates',
      'advanced-settings',
    ]);
    const pages = [];
    for (const link of links) {
      expect(link.permissions?.length).toBeGreaterThan(0);
      if (link.Component === undefined) throw new Error(`Missing page for ${link.id}`);
      const module = await link.Component();
      pages.push(module.default);
    }
    expect(pages).toEqual([
      Roles,
      ProtectedProvidersPage,
      ProtectedEmailTemplatesPage,
      ProtectedAdvancedSettingsPage,
    ]);
  });

  it('namespaces available translations and tolerates an unavailable locale', async () => {
    const translations = await plugin.registerTrads({ locales: ['en', 'missing-locale'] });
    expect(translations).toEqual([
      {
        locale: 'en',
        data: Object.fromEntries(
          Object.entries(english).map(([key, value]) => [`users-permissions.${key}`, value])
        ),
      },
      { locale: 'missing-locale', data: {} },
    ]);
  });
});
