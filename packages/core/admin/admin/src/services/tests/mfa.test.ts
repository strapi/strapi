import { renderHook, server, waitFor, act } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import {
  useGetMfaStatusQuery,
  useMarkMfaNoticesSeenMutation,
  useGetMfaNoticesQuery,
  useVerifyMfaEnrolmentMutation,
  useDisableMfaMutation,
  useUnlockUserMfaMutation,
  useGetTrustedDevicesQuery,
  useGetPasskeysQuery,
  usePasskeyRegistrationOptionsMutation,
  useRegisterPasskeyMutation,
  useDeletePasskeyMutation,
  useGetUserPasskeysQuery,
  useDeleteUserPasskeysMutation,
} from '../mfa';

import type { Passkey } from '../../../../shared/contracts/mfa';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';

/** A minimal, fully-typed `RegistrationResponseJSON` -- the shape `startRegistration` resolves
 * to and `registerPasskey` forwards to the server untouched. */
const REGISTRATION: RegistrationResponseJSON = {
  id: 'credential-id',
  rawId: 'credential-id',
  response: {
    clientDataJSON: 'client-data-json',
    attestationObject: 'attestation-object',
  },
  clientExtensionResults: {},
  type: 'public-key',
};

const CREATION_OPTIONS: PublicKeyCredentialCreationOptionsJSON = {
  rp: { name: 'Strapi' },
  user: { id: 'user-id', name: 'user@example.com', displayName: 'User' },
  challenge: 'challenge',
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
};

const NEW_PASSKEY: Passkey = {
  id: '1',
  name: 'MacBook Touch ID',
  createdAt: '2026-09-01T10:00:00.000Z',
  lastUsedAt: null,
};

describe('mfa service', () => {
  it('exposes the /mfa/me status shape', async () => {
    server.use(
      http.get('/admin/mfa/me', () =>
        HttpResponse.json({
          data: {
            enabled: true,
            enabledAt: '2026-09-01T10:00:00.000Z',
            recoveryCodesRemaining: 7,
            codesAcknowledged: false,
            required: false,
            graceUntil: null,
          },
        })
      )
    );

    const { result } = renderHook(() => useGetMfaStatusQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      enabled: true,
      enabledAt: '2026-09-01T10:00:00.000Z',
      recoveryCodesRemaining: 7,
      codesAcknowledged: false,
      required: false,
      graceUntil: null,
    });
  });

  it('surfaces a 404 (flag off) as an error with status 404 instead of throwing', async () => {
    server.use(http.get('/admin/mfa/me', () => new HttpResponse(null, { status: 404 })));

    const { result } = renderHook(() => useGetMfaStatusQuery());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404 });
  });

  it('marking notices seen invalidates the notices list', async () => {
    let calls = 0;
    server.use(
      http.get('/admin/mfa/notices', () => {
        calls += 1;
        return HttpResponse.json({
          data:
            calls === 1
              ? [
                  {
                    id: 1,
                    type: 'challenge_failed',
                    metadata: {},
                    createdAt: '2026-09-01T10:00:00.000Z',
                    seenAt: null,
                  },
                ]
              : [],
        });
      }),
      http.post('/admin/mfa/notices/seen', () => new HttpResponse(null, { status: 204 }))
    );

    const { result } = renderHook(() => {
      const notices = useGetMfaNoticesQuery();
      const [markSeen] = useMarkMfaNoticesSeenMutation();
      return { notices, markSeen };
    });

    await waitFor(() => expect(result.current.notices.data).toHaveLength(1));
    await result.current.markSeen({ ids: [1] });
    await waitFor(() => expect(result.current.notices.data).toHaveLength(0));
    expect(calls).toBe(2);
  });

  /**
   * Minor (b): `verifyMfaEnrolment` creates an `enabled` notice server-side, and `disableMfa`
   * creates a `disabled` one -- neither mutation invalidated the `MfaNotices` tag, so a
   * still-mounted `useGetMfaNoticesQuery` (e.g. `MfaNotices`, `TwoFactorSection`) would not learn
   * about the new notice until some unrelated refetch happened to occur.
   */
  it('verifying enrolment invalidates the notices list', async () => {
    let calls = 0;
    server.use(
      http.get('/admin/mfa/notices', () => {
        calls += 1;
        return HttpResponse.json({ data: calls === 1 ? [] : [{ id: 1 }] });
      }),
      http.post('/admin/mfa/enrol/verify', () =>
        HttpResponse.json({ data: { recoveryCodes: ['ABCDE12345'] } })
      )
    );

    const { result } = renderHook(() => {
      const notices = useGetMfaNoticesQuery();
      const [verify] = useVerifyMfaEnrolmentMutation();
      return { notices, verify };
    });

    await waitFor(() => expect(result.current.notices.data).toHaveLength(0));
    await result.current.verify({ code: '123456' });
    await waitFor(() => expect(result.current.notices.data).toHaveLength(1));
    expect(calls).toBe(2);
  });

  it('disabling mfa invalidates the notices list', async () => {
    let calls = 0;
    server.use(
      http.get('/admin/mfa/notices', () => {
        calls += 1;
        return HttpResponse.json({ data: calls === 1 ? [] : [{ id: 1 }] });
      }),
      http.post('/admin/mfa/disable', () => new HttpResponse(null, { status: 204 }))
    );

    const { result } = renderHook(() => {
      const notices = useGetMfaNoticesQuery();
      const [disable] = useDisableMfaMutation();
      return { notices, disable };
    });

    await waitFor(() => expect(result.current.notices.data).toHaveLength(0));
    await result.current.disable({ password: 'Testing123!', code: '123456' });
    await waitFor(() => expect(result.current.notices.data).toHaveLength(1));
    expect(calls).toBe(2);
  });

  it('POSTs /admin/mfa/users/:id/unlock with no body', async () => {
    let hit = false;
    let body: string | undefined;
    server.use(
      http.post('/admin/mfa/users/42/unlock', async ({ request }) => {
        hit = true;
        body = await request.text();
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useUnlockUserMfaMutation());

    await act(async () => {
      const res = await result.current[0]({ id: 42 });
      expect('error' in res).toBe(false);
    });

    expect(hit).toBe(true);
    expect(body).toBe('');
  });

  describe('passkeys', () => {
    it('exposes the /mfa/passkeys list', async () => {
      let method: string | undefined;
      server.use(
        http.get('/admin/mfa/passkeys', ({ request }) => {
          method = request.method;
          return HttpResponse.json({ data: [NEW_PASSKEY] });
        })
      );

      const { result } = renderHook(() => useGetPasskeysQuery());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(method).toBe('GET');
      expect(result.current.data).toEqual([NEW_PASSKEY]);
    });

    it('POSTs /admin/mfa/passkeys/options with the password and code, and unwraps the creation options', async () => {
      let method: string | undefined;
      let body: unknown;
      server.use(
        http.post('/admin/mfa/passkeys/options', async ({ request }) => {
          method = request.method;
          body = await request.json();
          return HttpResponse.json({ data: CREATION_OPTIONS });
        })
      );

      const { result } = renderHook(() => usePasskeyRegistrationOptionsMutation());

      await act(async () => {
        const res = await result.current[0]({ password: 'Testing123!', code: '123456' });
        expect('data' in res && res.data).toEqual(CREATION_OPTIONS);
      });

      expect(method).toBe('POST');
      expect(body).toEqual({ password: 'Testing123!', code: '123456' });
    });

    it('POSTs /admin/mfa/passkeys with the name and registration untouched, and unwraps the new passkey', async () => {
      let method: string | undefined;
      let body: unknown;
      server.use(
        http.post('/admin/mfa/passkeys', async ({ request }) => {
          method = request.method;
          body = await request.json();
          return HttpResponse.json({ data: NEW_PASSKEY });
        })
      );

      const { result } = renderHook(() => useRegisterPasskeyMutation());

      await act(async () => {
        const res = await result.current[0]({ name: NEW_PASSKEY.name, registration: REGISTRATION });
        expect('data' in res && res.data).toEqual(NEW_PASSKEY);
      });

      expect(method).toBe('POST');
      expect(body).toEqual({ name: NEW_PASSKEY.name, registration: REGISTRATION });
    });

    /**
     * Registration must refetch the notices list and the passkeys list, and must NOT refetch
     * trusted devices. All three are asserted from one subscription so the "does not invalidate" half has a real synchronisation point: by the
     * time the two genuine refetches have landed, an erroneous trusted-devices refetch (mocked
     * with no artificial delay) would have landed too.
     */
    it('registering a passkey invalidates notices and the passkeys list, but not trusted devices', async () => {
      let noticesCalls = 0;
      let passkeysCalls = 0;
      let trustedDevicesCalls = 0;
      server.use(
        http.get('/admin/mfa/notices', () => {
          noticesCalls += 1;
          return HttpResponse.json({ data: noticesCalls === 1 ? [] : [{ id: 1 }] });
        }),
        http.get('/admin/mfa/passkeys', () => {
          passkeysCalls += 1;
          return HttpResponse.json({ data: passkeysCalls === 1 ? [] : [NEW_PASSKEY] });
        }),
        http.get('/admin/mfa/trusted-devices', () => {
          trustedDevicesCalls += 1;
          return HttpResponse.json({ data: [] });
        }),
        http.post('/admin/mfa/passkeys', () => HttpResponse.json({ data: NEW_PASSKEY }))
      );

      const { result } = renderHook(() => {
        const notices = useGetMfaNoticesQuery();
        const passkeys = useGetPasskeysQuery();
        const trustedDevices = useGetTrustedDevicesQuery();
        const [register] = useRegisterPasskeyMutation();
        return { notices, passkeys, trustedDevices, register };
      });

      await waitFor(() => expect(result.current.notices.isSuccess).toBe(true));
      await waitFor(() => expect(result.current.passkeys.isSuccess).toBe(true));
      await waitFor(() => expect(result.current.trustedDevices.isSuccess).toBe(true));

      await act(async () => {
        await result.current.register({ name: NEW_PASSKEY.name, registration: REGISTRATION });
      });

      await waitFor(() => expect(result.current.notices.data).toHaveLength(1));
      await waitFor(() => expect(result.current.passkeys.data).toHaveLength(1));

      expect(noticesCalls).toBe(2);
      expect(passkeysCalls).toBe(2);
      expect(trustedDevicesCalls).toBe(1);
    });

    it('DELETEs /admin/mfa/passkeys/:id with no body, and returns 204 with no body', async () => {
      let method: string | undefined;
      let bodyText: string | undefined;
      server.use(
        http.delete('/admin/mfa/passkeys/1', async ({ request }) => {
          method = request.method;
          bodyText = await request.text();
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useDeletePasskeyMutation());

      await act(async () => {
        const res = await result.current[0]({ id: '1' });
        expect('error' in res).toBe(false);
        // A real 204 has no body: the fetch client's own 204 special-case answers `{}` without
        // attempting to parse one, so this pins "no body" rather than tolerating whatever shape a
        // future response might carry.
        expect('data' in res && res.data).toEqual({});
      });

      expect(method).toBe('DELETE');
      expect(bodyText).toBe('');
    });

    it('deleting a passkey invalidates the passkeys list and the notices list', async () => {
      let passkeysCalls = 0;
      let noticesCalls = 0;
      server.use(
        http.get('/admin/mfa/passkeys', () => {
          passkeysCalls += 1;
          return HttpResponse.json({ data: passkeysCalls === 1 ? [NEW_PASSKEY] : [] });
        }),
        http.get('/admin/mfa/notices', () => {
          noticesCalls += 1;
          return HttpResponse.json({ data: noticesCalls === 1 ? [] : [{ id: 1 }] });
        }),
        http.delete('/admin/mfa/passkeys/1', () => new HttpResponse(null, { status: 204 }))
      );

      const { result } = renderHook(() => {
        const passkeys = useGetPasskeysQuery();
        const notices = useGetMfaNoticesQuery();
        const [del] = useDeletePasskeyMutation();
        return { passkeys, notices, del };
      });

      await waitFor(() => expect(result.current.passkeys.data).toHaveLength(1));
      await waitFor(() => expect(result.current.notices.isSuccess).toBe(true));

      await act(async () => {
        await result.current.del({ id: '1' });
      });

      await waitFor(() => expect(result.current.passkeys.data).toHaveLength(0));
      await waitFor(() => expect(result.current.notices.data).toHaveLength(1));

      expect(passkeysCalls).toBe(2);
      expect(noticesCalls).toBe(2);
    });

    it("exposes an administrator's view of another user's passkey count", async () => {
      server.use(
        http.get('/admin/mfa/users/42/passkeys', () => HttpResponse.json({ data: { count: 3 } }))
      );

      const { result } = renderHook(() => useGetUserPasskeysQuery({ id: 42 }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ count: 3 });
    });

    it('DELETEs /admin/mfa/users/:id/passkeys with no body, and returns 204 with no body', async () => {
      let method: string | undefined;
      let bodyText: string | undefined;
      server.use(
        http.delete('/admin/mfa/users/42/passkeys', async ({ request }) => {
          method = request.method;
          bodyText = await request.text();
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => useDeleteUserPasskeysMutation());

      await act(async () => {
        const res = await result.current[0]({ id: 42 });
        expect('error' in res).toBe(false);
        // Same 204-with-no-body pin as `deletePasskey` above.
        expect('data' in res && res.data).toEqual({});
      });

      expect(method).toBe('DELETE');
      expect(bodyText).toBe('');
    });

    it("removing a user's passkeys invalidates that user's count, the caller's own list, and notices", async () => {
      let userPasskeysCalls = 0;
      let passkeysCalls = 0;
      let noticesCalls = 0;
      server.use(
        http.get('/admin/mfa/users/42/passkeys', () => {
          userPasskeysCalls += 1;
          return HttpResponse.json({ data: { count: userPasskeysCalls === 1 ? 2 : 0 } });
        }),
        http.get('/admin/mfa/passkeys', () => {
          passkeysCalls += 1;
          return HttpResponse.json({ data: passkeysCalls === 1 ? [NEW_PASSKEY] : [] });
        }),
        http.get('/admin/mfa/notices', () => {
          noticesCalls += 1;
          return HttpResponse.json({ data: noticesCalls === 1 ? [] : [{ id: 1 }] });
        }),
        http.delete('/admin/mfa/users/42/passkeys', () => new HttpResponse(null, { status: 204 }))
      );

      const { result } = renderHook(() => {
        const userPasskeys = useGetUserPasskeysQuery({ id: 42 });
        const passkeys = useGetPasskeysQuery();
        const notices = useGetMfaNoticesQuery();
        const [del] = useDeleteUserPasskeysMutation();
        return { userPasskeys, passkeys, notices, del };
      });

      await waitFor(() => expect(result.current.userPasskeys.data).toEqual({ count: 2 }));
      await waitFor(() => expect(result.current.passkeys.data).toHaveLength(1));
      await waitFor(() => expect(result.current.notices.isSuccess).toBe(true));

      await act(async () => {
        await result.current.del({ id: 42 });
      });

      await waitFor(() => expect(result.current.userPasskeys.data).toEqual({ count: 0 }));
      await waitFor(() => expect(result.current.passkeys.data).toHaveLength(0));
      await waitFor(() => expect(result.current.notices.data).toHaveLength(1));

      expect(userPasskeysCalls).toBe(2);
      expect(passkeysCalls).toBe(2);
      expect(noticesCalls).toBe(2);
    });

    it('disabling mfa also invalidates the passkeys list', async () => {
      let passkeysCalls = 0;
      server.use(
        http.get('/admin/mfa/passkeys', () => {
          passkeysCalls += 1;
          return HttpResponse.json({ data: passkeysCalls === 1 ? [NEW_PASSKEY] : [] });
        }),
        http.post('/admin/mfa/disable', () => new HttpResponse(null, { status: 204 }))
      );

      const { result } = renderHook(() => {
        const passkeys = useGetPasskeysQuery();
        const [disable] = useDisableMfaMutation();
        return { passkeys, disable };
      });

      await waitFor(() => expect(result.current.passkeys.data).toHaveLength(1));
      await result.current.disable({ password: 'Testing123!', code: '123456' });
      await waitFor(() => expect(result.current.passkeys.data).toHaveLength(0));
      expect(passkeysCalls).toBe(2);
    });
  });
});
