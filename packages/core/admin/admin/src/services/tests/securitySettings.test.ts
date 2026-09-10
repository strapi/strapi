import { renderHook, server, waitFor, act } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useGetPasskeysQuery, useGetUserPasskeysQuery } from '../mfa';
import {
  useGetSecuritySettingsQuery,
  useUpdateSecuritySettingsMutation,
} from '../securitySettings';

import type { Passkey } from '../../../../shared/contracts/mfa';

const SETTINGS = { mfa: { mode: 'optional', graceDays: 7, requiredRoles: ['2'] } } as const;

const A_PASSKEY: Passkey = {
  id: '1',
  name: 'MacBook Touch ID',
  createdAt: '2026-09-01T10:00:00.000Z',
  lastUsedAt: null,
};

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

  it('updating security settings invalidates the passkeys list and a user passkey count (cycle 4)', async () => {
    let passkeysCalls = 0;
    let userPasskeysCalls = 0;
    server.use(
      http.get('/admin/mfa/passkeys', () => {
        passkeysCalls += 1;
        return HttpResponse.json({ data: passkeysCalls === 1 ? [A_PASSKEY] : [] });
      }),
      http.get('/admin/mfa/users/42/passkeys', () => {
        userPasskeysCalls += 1;
        return HttpResponse.json({ data: { count: userPasskeysCalls === 1 ? 1 : 0 } });
      }),
      http.put('/admin/security-settings', () => HttpResponse.json({ data: SETTINGS }))
    );

    const { result } = renderHook(() => {
      const passkeys = useGetPasskeysQuery();
      const userPasskeys = useGetUserPasskeysQuery({ id: 42 });
      const [update] = useUpdateSecuritySettingsMutation();
      return { passkeys, userPasskeys, update };
    });

    await waitFor(() => expect(result.current.passkeys.data).toHaveLength(1));
    await waitFor(() => expect(result.current.userPasskeys.data).toEqual({ count: 1 }));

    await act(async () => {
      await result.current.update({
        passkeys: { enabled: false },
        password: 'Testing123!',
        code: '123456',
      });
    });

    await waitFor(() => expect(result.current.passkeys.data).toHaveLength(0));
    await waitFor(() => expect(result.current.userPasskeys.data).toEqual({ count: 0 }));

    expect(passkeysCalls).toBe(2);
    expect(userPasskeysCalls).toBe(2);
  });
});
