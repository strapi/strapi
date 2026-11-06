import { createHash, randomBytes } from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

/** The identity the fake issuer vouches for. `sub` is the account id at the provider. */
export interface FakeOidcUser {
  sub: string;
  email: string;
  name: string;
  email_verified: boolean;
  /** An extra claim, to map to a profile field: userinfo sends the whole object. */
  department?: string;
}

/** What the token endpoint was asked, and whether it was asked properly. */
export interface FakeOidcTokenCall {
  clientId: string;
  /** The secret as the client sent it, to show the stored one was decrypted before it was used. */
  clientSecret: string;
  /** The PKCE verifier hashed with S256 equals the challenge the authorize call carried. */
  pkceValid: boolean;
  redirectUri: string;
}

export interface FakeOidc {
  issuer: string;
  discoveryUrl: string;
  /** Who the next authorize call signs in. Change it between sign-ins. */
  user: FakeOidcUser;
  /** The authorize requests seen, as the query the client sent. */
  authorizeCalls: Array<Record<string, string>>;
  tokenCalls: FakeOidcTokenCall[];
  /** Forgets the calls; the user stays. */
  reset(): void;
  stop(): Promise<void>;
}

const s256 = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

const readForm = (request: http.IncomingMessage): Promise<URLSearchParams> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))));
    request.on('error', reject);
  });

const json = (response: http.ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

/**
 * An OpenID Connect issuer for the API tests, on a port of its own on 127.0.0.1: discovery,
 * authorize (which approves at once and sends the browser back with a code), token (which checks
 * the PKCE verifier and the redirect URI) and userinfo. OAuth needs a server of its own, with a
 * lifecycle apart from Strapi's: `createEndUsersInstance({ fakeOidc })` stops it with the instance.
 *
 * It hands out no ID token, so the engine reads the user from userinfo. Discovery announces ID
 * token algorithms and no key set, which makes the provider OpenID Connect (the account id is
 * `sub`) with nothing to verify.
 */
export const startFakeOidc = async (): Promise<FakeOidc> => {
  const codes = new Map<
    string,
    { challenge: string; method: string; redirectUri: string; user: FakeOidcUser }
  >();
  const tokens = new Map<string, FakeOidcUser>();

  const state: FakeOidc = {
    issuer: '',
    discoveryUrl: '',
    user: {
      sub: 'fake-subject-1',
      email: 'oidc-user@example.com',
      name: 'OIDC User',
      email_verified: true,
    },
    authorizeCalls: [],
    tokenCalls: [],
    reset() {
      state.authorizeCalls.length = 0;
      state.tokenCalls.length = 0;
    },
    stop: () => Promise.resolve(),
  };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', state.issuer || 'http://127.0.0.1');

    try {
      if (request.method === 'GET' && url.pathname === '/.well-known/openid-configuration') {
        return json(response, 200, {
          issuer: state.issuer,
          authorization_endpoint: `${state.issuer}/authorize`,
          token_endpoint: `${state.issuer}/token`,
          userinfo_endpoint: `${state.issuer}/userinfo`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          code_challenge_methods_supported: ['S256'],
        });
      }

      if (request.method === 'GET' && url.pathname === '/authorize') {
        const query = Object.fromEntries(url.searchParams);

        state.authorizeCalls.push(query);

        const redirectUri = query.redirect_uri;

        if (!redirectUri || !query.state) {
          return json(response, 400, { error: 'invalid_request' });
        }

        const code = randomBytes(16).toString('hex');

        codes.set(code, {
          challenge: query.code_challenge ?? '',
          method: query.code_challenge_method ?? '',
          redirectUri,
          user: { ...state.user },
        });

        const back = new URL(redirectUri);

        back.searchParams.set('code', code);
        back.searchParams.set('state', query.state);

        response.writeHead(302, { location: back.toString() });

        return response.end();
      }

      if (request.method === 'POST' && url.pathname === '/token') {
        const form = await readForm(request);
        const basic = /^Basic (.+)$/.exec(request.headers.authorization ?? '');
        const [basicId = '', basicSecret = ''] = basic
          ? Buffer.from(basic[1], 'base64').toString('utf8').split(':')
          : [];
        const grant = codes.get(form.get('code') ?? '');

        if (form.get('grant_type') !== 'authorization_code' || !grant) {
          return json(response, 400, { error: 'invalid_grant' });
        }

        codes.delete(form.get('code') as string);

        const verifier = form.get('code_verifier') ?? '';
        const call: FakeOidcTokenCall = {
          clientId: form.get('client_id') ?? decodeURIComponent(basicId),
          clientSecret: form.get('client_secret') ?? decodeURIComponent(basicSecret),
          pkceValid:
            grant.method === 'S256' && verifier !== '' && s256(verifier) === grant.challenge,
          redirectUri: form.get('redirect_uri') ?? '',
        };

        state.tokenCalls.push(call);

        if (!call.pkceValid || call.redirectUri !== grant.redirectUri) {
          return json(response, 400, { error: 'invalid_grant' });
        }

        const accessToken = randomBytes(16).toString('hex');

        tokens.set(accessToken, grant.user);

        return json(response, 200, {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email',
        });
      }

      if (request.method === 'GET' && url.pathname === '/userinfo') {
        const bearer = /^Bearer (.+)$/.exec(request.headers.authorization ?? '');
        const user = bearer ? tokens.get(bearer[1]) : undefined;

        return user ? json(response, 200, user) : json(response, 401, { error: 'invalid_token' });
      }

      return json(response, 404, { error: 'not_found' });
    } catch {
      return json(response, 500, { error: 'server_error' });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  state.issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  state.discoveryUrl = `${state.issuer}/.well-known/openid-configuration`;
  state.stop = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });

  return state;
};
