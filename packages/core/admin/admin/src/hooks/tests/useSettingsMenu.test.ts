import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { normalizeSettings, useSettingsMenu } from '../useSettingsMenu';

describe('useSettingsMenu', () => {
  const originalStrapi = window.strapi;

  beforeEach(() => {
    window.strapi = {
      ...originalStrapi,
      isEE: true,
      features: {
        ...originalStrapi.features,
        isEnabled: (name?: string) => name === 'audit-logs',
      },
    };
  });

  afterEach(() => {
    window.strapi = originalStrapi;
  });

  const respondWith = (auditLogs: { enabled: boolean }) =>
    server.use(
      http.get('/admin/license-limit-information', () =>
        HttpResponse.json({ data: { features: [{ name: 'audit-logs' }], auditLogs } })
      )
    );

  const getAdminLinkIds = async () => {
    const { result } = renderHook(() => useSettingsMenu());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // The EE links load asynchronously after the CE ones.
    await waitFor(() =>
      expect(
        result.current.menu
          .find((section) => section.id === 'permissions')
          ?.links.some((link) => link.id === 'roles')
      ).toBe(true)
    );

    return () =>
      result.current.menu
        .find((section) => section.id === 'permissions')
        ?.links.map((link) => link.id) ?? [];
  };

  it('lists the audit logs link when the config keeps audit logs enabled', async () => {
    respondWith({ enabled: true });

    const adminLinkIds = await getAdminLinkIds();

    await waitFor(() => expect(adminLinkIds()).toContain('auditLogs'));
  });

  it('hides the audit logs link when the config disables audit logs', async () => {
    respondWith({ enabled: false });

    const adminLinkIds = await getAdminLinkIds();

    await waitFor(() => expect(adminLinkIds()).toContain('users'));
    await waitFor(() => expect(adminLinkIds()).not.toContain('auditLogs'));
    expect(adminLinkIds()).not.toContain('auditLogs-purchase-page');
  });
});

describe('normalizeSettings', () => {
  it('returns a stable global section when settings are missing', () => {
    expect(normalizeSettings(undefined)).toEqual({
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [],
      },
    });
  });

  it('drops malformed settings sections and links, and defaults missing permissions', () => {
    expect(
      normalizeSettings({
        global: {
          id: 'global',
          intlLabel: {
            id: 'Settings.global',
            defaultMessage: 'Global Settings',
          },
          links: [
            undefined,
            {
              id: 'valid-link',
              to: 'valid-link',
              intlLabel: {
                id: 'valid-link',
                defaultMessage: 'Valid link',
              },
            },
            {
              id: 'missing-to',
              intlLabel: {
                id: 'missing-to',
                defaultMessage: 'Missing to',
              },
            },
          ],
        },
        broken: {
          links: [],
        },
      })
    ).toEqual({
      global: {
        id: 'global',
        intlLabel: {
          id: 'Settings.global',
          defaultMessage: 'Global Settings',
        },
        links: [
          {
            id: 'valid-link',
            to: 'valid-link',
            intlLabel: {
              id: 'valid-link',
              defaultMessage: 'Valid link',
            },
            permissions: [],
          },
        ],
      },
    });
  });
});
