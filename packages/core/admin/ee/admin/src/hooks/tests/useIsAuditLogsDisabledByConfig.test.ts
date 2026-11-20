import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useIsAuditLogsDisabledByConfig } from '../useIsAuditLogsDisabledByConfig';

describe('useIsAuditLogsDisabledByConfig', () => {
  const originalStrapi = window.strapi;

  const setLicensed = (licensed: boolean) => {
    window.strapi = {
      ...originalStrapi,
      features: {
        ...originalStrapi.features,
        isEnabled: (name?: string) => licensed === true && name === 'audit-logs',
      },
    };
  };

  const respondWith = (auditLogs: { enabled: boolean }) =>
    server.use(
      http.get('/admin/license-limit-information', () =>
        HttpResponse.json({ data: { features: [{ name: 'audit-logs' }], auditLogs } })
      )
    );

  afterEach(() => {
    window.strapi = originalStrapi;
  });

  it('is true once the server reports audit logs disabled by config', async () => {
    setLicensed(true);
    respondWith({ enabled: false });

    const { result } = renderHook(() => useIsAuditLogsDisabledByConfig());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isDisabledByConfig).toBe(true);
  });

  it('is false when the server reports audit logs enabled', async () => {
    setLicensed(true);
    respondWith({ enabled: true });

    const { result } = renderHook(() => useIsAuditLogsDisabledByConfig());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isDisabledByConfig).toBe(false);
  });

  it('is false without the license feature, whatever the server says', async () => {
    setLicensed(false);
    respondWith({ enabled: false });

    const { result } = renderHook(() => useIsAuditLogsDisabledByConfig());

    expect(result.current).toEqual({ isLoading: false, isDisabledByConfig: false });
  });
});
