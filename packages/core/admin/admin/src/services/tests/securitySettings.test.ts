import { renderHook, server, waitFor, act } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import {
  useGetSecuritySettingsQuery,
  useUpdateSecuritySettingsMutation,
} from '../securitySettings';

const SETTINGS = { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] } } as const;

describe('security-settings service', () => {
  it('reads GET /admin/security-settings and unwraps data', async () => {
    server.use(http.get('/admin/security-settings', () => HttpResponse.json({ data: SETTINGS })));

    const { result } = renderHook(() => useGetSecuritySettingsQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SETTINGS);
  });

  it('surfaces a 404 (feature off) as an error carrying the status', async () => {
    server.use(http.get('/admin/security-settings', () => new HttpResponse(null, { status: 404 })));

    const { result } = renderHook(() => useGetSecuritySettingsQuery());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404 });
  });

  it('PUTs the whole body (mfa plus optional credentials) and unwraps data', async () => {
    let received: unknown;
    server.use(
      http.put('/admin/security-settings', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: SETTINGS });
      })
    );

    const { result } = renderHook(() => useUpdateSecuritySettingsMutation());

    await act(async () => {
      const res = await result.current[0]({
        mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] },
        password: 'Testing123!',
        code: '123456',
      });
      expect('data' in res && res.data).toEqual(SETTINGS);
    });

    expect(received).toEqual({
      mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] },
      password: 'Testing123!',
      code: '123456',
    });
  });
});
