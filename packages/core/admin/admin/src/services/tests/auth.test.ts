import { renderHook, server, act } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useLoginMfaWebauthnOptionsMutation, useLoginMfaWebauthnMutation } from '../auth';

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

const REQUEST_OPTIONS: PublicKeyCredentialRequestOptionsJSON = {
  challenge: 'challenge',
};

/** A minimal, fully-typed `AuthenticationResponseJSON` -- the shape `startAuthentication`
 * resolves to and `loginMfaWebauthn` forwards to the server untouched. */
const ASSERTION: AuthenticationResponseJSON = {
  id: 'credential-id',
  rawId: 'credential-id',
  response: {
    clientDataJSON: 'client-data-json',
    authenticatorData: 'authenticator-data',
    signature: 'signature',
  },
  clientExtensionResults: {},
  type: 'public-key',
};

describe('auth service (cycle 4 passkey login)', () => {
  it('POSTs /admin/login/mfa/webauthn/options with the challenge token, and unwraps the request options', async () => {
    let method: string | undefined;
    let body: unknown;
    server.use(
      http.post('/admin/login/mfa/webauthn/options', async ({ request }) => {
        method = request.method;
        body = await request.json();
        return HttpResponse.json({ data: REQUEST_OPTIONS });
      })
    );

    const { result } = renderHook(() => useLoginMfaWebauthnOptionsMutation());

    await act(async () => {
      const res = await result.current[0]({ challengeToken: 'challenge-token' });
      expect('data' in res && res.data).toEqual(REQUEST_OPTIONS);
    });

    expect(method).toBe('POST');
    expect(body).toEqual({ challengeToken: 'challenge-token' });
  });

  /**
   * `deviceId` and `rememberMe` are not decoration: the server reads both out of this body when
   * it issues the session (see `MfaWebauthnLogin`'s doc comment in `shared/contracts/mfa.ts`), so
   * a test that only checks `challengeToken`/`assertion` would not notice either one silently
   * getting dropped on the way to the request.
   */
  it('POSTs /admin/login/mfa/webauthn with the assertion, deviceId and rememberMe, and unwraps the session', async () => {
    let method: string | undefined;
    let body: unknown;
    server.use(
      http.post('/admin/login/mfa/webauthn', async ({ request }) => {
        method = request.method;
        body = await request.json();
        return HttpResponse.json({
          data: { token: 'session-token', user: { id: 1, email: 'user@example.com' } },
        });
      })
    );

    const { result } = renderHook(() => useLoginMfaWebauthnMutation());

    await act(async () => {
      const res = await result.current[0]({
        challengeToken: 'challenge-token',
        assertion: ASSERTION,
        deviceId: 'device-1',
        rememberMe: true,
      });
      expect('data' in res && res.data).toEqual({
        token: 'session-token',
        user: { id: 1, email: 'user@example.com' },
      });
    });

    expect(method).toBe('POST');
    expect(body).toEqual({
      challengeToken: 'challenge-token',
      assertion: ASSERTION,
      deviceId: 'device-1',
      rememberMe: true,
    });
  });
});
