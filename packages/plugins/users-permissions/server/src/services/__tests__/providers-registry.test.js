'use strict';

/* eslint-env jest */

jest.mock('../../utils/provider-http');
jest.mock('../../utils/verify-jwt-with-jwks');
jest.mock('../../utils/oauth-connect/oauth1');

const { bearerGet, fetchJson } = require('../../utils/provider-http');
const { verifyJwtWithJwks } = require('../../utils/verify-jwt-with-jwks');
const { twitterGet } = require('../../utils/oauth-connect/oauth1');

const setRequestMock = (requestMock) => {
  bearerGet.mockImplementation(() => requestMock());
  fetchJson.mockImplementation(() => requestMock());
  twitterGet.mockImplementation(() => requestMock());
};

// providers-registry reads global `strapi` at call time — provide a minimal stub
global.strapi = {
  config: {
    get: jest.fn().mockReturnValue('/api'),
    server: { url: 'http://localhost:1337' },
  },
};

const providersRegistry = require('../providers-registry');

describe('cognito authCallback — email_verified guard', () => {
  const FAKE_ID_TOKEN = 'fake.id.token';

  let cognitoProvider;

  beforeAll(() => {
    const registry = providersRegistry();
    cognitoProvider = registry.get('cognito');
  });

  const mockJwtVerifyWith = (payload) => {
    verifyJwtWithJwks.mockResolvedValue(payload);
  };

  it('returns username and email when email_verified is true (boolean)', async () => {
    mockJwtVerifyWith({
      'cognito:username': 'john_doe',
      email: 'john@example.com',
      email_verified: true,
    });

    const result = await cognitoProvider.authCallback({
      grantResponse: { id_token: FAKE_ID_TOKEN },
      providers: { cognito: { jwksurl: 'https://cognito.example.com/.well-known/jwks.json' } },
    });

    expect(result).toEqual({ username: 'john_doe', email: 'john@example.com' });
  });

  it('throws when email_verified is false', async () => {
    mockJwtVerifyWith({
      'cognito:username': 'attacker',
      email: 'victim@example.com',
      email_verified: false,
    });

    await expect(
      cognitoProvider.authCallback({
        grantResponse: { id_token: FAKE_ID_TOKEN },
        providers: { cognito: { jwksurl: 'https://cognito.example.com/.well-known/jwks.json' } },
      })
    ).rejects.toThrow('Email not verified by Cognito');
  });

  it('throws when email_verified is absent from the token', async () => {
    mockJwtVerifyWith({
      'cognito:username': 'someone',
      email: 'someone@example.com',
      // email_verified intentionally omitted
    });

    await expect(
      cognitoProvider.authCallback({
        grantResponse: { id_token: FAKE_ID_TOKEN },
        providers: { cognito: { jwksurl: 'https://cognito.example.com/.well-known/jwks.json' } },
      })
    ).rejects.toThrow('Email not verified by Cognito');
  });

  it('throws when email_verified is the string "true" (not boolean)', async () => {
    // The OIDC spec requires email_verified to be a boolean; string "true" must NOT bypass the guard
    mockJwtVerifyWith({
      'cognito:username': 'tricky',
      email: 'tricky@example.com',
      email_verified: 'true',
    });

    await expect(
      cognitoProvider.authCallback({
        grantResponse: { id_token: FAKE_ID_TOKEN },
        providers: { cognito: { jwksurl: 'https://cognito.example.com/.well-known/jwks.json' } },
      })
    ).rejects.toThrow('Email not verified by Cognito');
  });

  it('rejects when id_token is missing from the OAuth session', async () => {
    await expect(
      cognitoProvider.authCallback({
        providers: { cognito: { jwksurl: 'https://cognito.example.com/.well-known/jwks.json' } },
      })
    ).rejects.toThrow('Cognito authentication requires a completed OAuth session');
  });

  it('rejects forged query id_token without a grant session', async () => {
    mockJwtVerifyWith({
      'cognito:username': 'attacker',
      email: 'victim@example.com',
      email_verified: true,
    });

    await expect(
      cognitoProvider.authCallback({
        query: { id_token: FAKE_ID_TOKEN },
        providers: { cognito: { jwksurl: 'https://cognito.example.com/.well-known/jwks.json' } },
      })
    ).rejects.toThrow('Cognito authentication requires a completed OAuth session');
  });
});

describe('google authCallback — verified email guard', () => {
  let googleProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);

    const registry = providersRegistry();
    googleProvider = registry.get('google');
  });

  const mockTokenInfo = (body) => {
    mockRequest.mockResolvedValue({ body });
  };

  it('returns username and email when verified_email is true (legacy boolean field)', async () => {
    mockTokenInfo({ email: 'john@example.com', verified_email: true });

    const result = await googleProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'john', email: 'john@example.com' });
  });

  it('returns username and email when email_verified is the string "true" (OIDC field)', async () => {
    mockTokenInfo({ email: 'jane@example.com', email_verified: 'true' });

    const result = await googleProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'jane', email: 'jane@example.com' });
  });

  it('throws when verified_email is false', async () => {
    mockTokenInfo({ email: 'victim@example.com', verified_email: false });

    await expect(googleProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Google'
    );
  });

  it('throws when email_verified is the string "false"', async () => {
    mockTokenInfo({ email: 'victim@example.com', email_verified: 'false' });

    await expect(googleProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Google'
    );
  });

  it('throws when no verified flag is present in the response', async () => {
    mockTokenInfo({ email: 'victim@example.com' });

    await expect(googleProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Google'
    );
  });
});

describe('discord authCallback — verified email guard', () => {
  let discordProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    discordProvider = providersRegistry().get('discord');
  });

  it('returns username and email when verified is true', async () => {
    mockRequest.mockResolvedValue({
      body: { username: 'nelly', discriminator: '0', email: 'nelly@example.com', verified: true },
    });

    const result = await discordProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'nelly', email: 'nelly@example.com' });
  });

  it('throws when verified is false', async () => {
    mockRequest.mockResolvedValue({
      body: { username: 'attacker', email: 'victim@example.com', verified: false },
    });

    await expect(discordProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Discord'
    );
  });

  it('throws when verified is absent', async () => {
    mockRequest.mockResolvedValue({
      body: { username: 'attacker', email: 'victim@example.com' },
    });

    await expect(discordProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Discord'
    );
  });
});

describe('github authCallback — verified email guard', () => {
  let githubProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    githubProvider = providersRegistry().get('github');
  });

  // First request resolves the /user body, second resolves the /user/emails body.
  const mockUserThenEmails = (userBody, emailsBody) => {
    mockRequest
      .mockResolvedValueOnce({ body: userBody })
      .mockResolvedValueOnce({ body: emailsBody });
  };

  it('returns the primary email when it is verified', async () => {
    mockUserThenEmails({ login: 'octocat', email: null }, [
      { email: 'secondary@example.com', primary: false, verified: true },
      { email: 'octocat@example.com', primary: true, verified: true },
    ]);

    const result = await githubProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'octocat', email: 'octocat@example.com' });
  });

  it('throws when the primary email is unverified', async () => {
    mockUserThenEmails({ login: 'attacker', email: null }, [
      { email: 'victim@example.com', primary: true, verified: false },
    ]);

    await expect(githubProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by GitHub'
    );
  });

  it('throws when no primary email is present', async () => {
    mockUserThenEmails({ login: 'attacker', email: null }, [
      { email: 'secondary@example.com', primary: false, verified: true },
    ]);

    await expect(githubProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by GitHub'
    );
  });
});

describe('auth0 authCallback — verified email guard', () => {
  let auth0Provider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    auth0Provider = providersRegistry().get('auth0');
  });

  const providersArg = { providers: { auth0: { subdomain: 'my-tenant.eu' } } };

  it('returns username and email when email_verified is true', async () => {
    mockRequest.mockResolvedValue({
      body: { nickname: 'john', email: 'john@example.com', email_verified: true },
    });

    const result = await auth0Provider.authCallback({ accessToken: 'fake-token', ...providersArg });

    expect(result).toEqual({ username: 'john', email: 'john@example.com' });
  });

  it('throws when a real email is not verified', async () => {
    mockRequest.mockResolvedValue({
      body: { nickname: 'attacker', email: 'victim@example.com', email_verified: false },
    });

    await expect(
      auth0Provider.authCallback({ accessToken: 'fake-token', ...providersArg })
    ).rejects.toThrow('Email not verified by Auth0');
  });

  it('keeps the generated fallback email when no email is returned', async () => {
    mockRequest.mockResolvedValue({ body: { nickname: 'no mail user' } });

    const result = await auth0Provider.authCallback({ accessToken: 'fake-token', ...providersArg });

    expect(result).toEqual({ username: 'no mail user', email: 'no.mail.user@strapi.io' });
  });
});

describe('keycloak authCallback — verified email guard', () => {
  let keycloakProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    keycloakProvider = providersRegistry().get('keycloak');
  });

  const providersArg = { providers: { keycloak: { subdomain: 'kc.example.com/realms/r' } } };

  it('returns username and email when email_verified is true', async () => {
    mockRequest.mockResolvedValue({
      body: { preferred_username: 'john', email: 'john@example.com', email_verified: true },
    });

    const result = await keycloakProvider.authCallback({
      accessToken: 'fake-token',
      ...providersArg,
    });

    expect(result).toEqual({ username: 'john', email: 'john@example.com' });
  });

  it('throws when email_verified is false', async () => {
    mockRequest.mockResolvedValue({
      body: { preferred_username: 'attacker', email: 'victim@example.com', email_verified: false },
    });

    await expect(
      keycloakProvider.authCallback({ accessToken: 'fake-token', ...providersArg })
    ).rejects.toThrow('Email not verified by Keycloak');
  });
});

describe('patreon authCallback — verified email guard', () => {
  let patreonProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    patreonProvider = providersRegistry().get('patreon');
  });

  it('returns username and email when is_email_verified is true', async () => {
    mockRequest.mockResolvedValue({
      body: {
        data: {
          attributes: { full_name: 'John Doe', email: 'john@example.com', is_email_verified: true },
        },
      },
    });

    const result = await patreonProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'John Doe', email: 'john@example.com' });
  });

  it('throws when is_email_verified is false', async () => {
    mockRequest.mockResolvedValue({
      body: {
        data: {
          attributes: {
            full_name: 'Attacker',
            email: 'victim@example.com',
            is_email_verified: false,
          },
        },
      },
    });

    await expect(patreonProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Patreon'
    );
  });

  it('throws when is_email_verified is absent', async () => {
    mockRequest.mockResolvedValue({
      body: {
        data: { attributes: { full_name: 'Attacker', email: 'victim@example.com' } },
      },
    });

    await expect(patreonProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Patreon'
    );
  });
});

describe('facebook authCallback — verified email guard', () => {
  let facebookProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    facebookProvider = providersRegistry().get('facebook');
  });

  it('returns username and email when Facebook returns a confirmed email', async () => {
    mockRequest.mockResolvedValue({ body: { name: 'John Doe', email: 'john@example.com' } });

    const result = await facebookProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'John Doe', email: 'john@example.com' });
  });

  it('throws when Facebook does not return an email', async () => {
    mockRequest.mockResolvedValue({ body: { name: 'No Email User' } });

    await expect(facebookProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by Facebook'
    );
  });
});

describe('github authCallback — public profile email verification', () => {
  let githubProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    githubProvider = providersRegistry().get('github');
  });

  it('accepts a public profile email only when it is verified', async () => {
    mockRequest
      .mockResolvedValueOnce({ body: { login: 'octocat', email: 'octocat@example.com' } })
      .mockResolvedValueOnce({
        body: [{ email: 'octocat@example.com', primary: true, verified: true }],
      });

    const result = await githubProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'octocat', email: 'octocat@example.com' });
  });

  it('rejects a public profile email that is not verified', async () => {
    mockRequest
      .mockResolvedValueOnce({ body: { login: 'attacker', email: 'victim@example.com' } })
      .mockResolvedValueOnce({
        body: [{ email: 'victim@example.com', primary: true, verified: false }],
      });

    await expect(githubProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by GitHub'
    );
  });
});

describe('twitter authCallback — server-side OAuth session guard', () => {
  let twitterProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    twitterProvider = providersRegistry().get('twitter');
  });

  const providersArg = { providers: { twitter: { key: 'key', secret: 'secret' } } };
  const grantSession = {
    access_secret: 'real-secret',
    raw: { screen_name: 'real_user' },
  };

  it('returns username and email from the grant session', async () => {
    mockRequest.mockResolvedValue({
      body: { screen_name: 'real_user', email: 'real_user@example.com' },
    });

    const result = await twitterProvider.authCallback({
      accessToken: 'fake-token',
      grantResponse: grantSession,
      ...providersArg,
    });

    expect(result).toEqual({ username: 'real_user', email: 'real_user@example.com' });
  });

  it('rejects forged query params without a grant session', async () => {
    await expect(
      twitterProvider.authCallback({
        accessToken: 'fake-token',
        query: {
          access_secret: 'forged-secret',
          'raw[screen_name]': 'victim',
        },
        ...providersArg,
      })
    ).rejects.toThrow('Twitter authentication requires a completed OAuth session');
  });

  it('throws when Twitter does not return an email', async () => {
    mockRequest.mockResolvedValue({ body: { screen_name: 'real_user' } });

    await expect(
      twitterProvider.authCallback({
        accessToken: 'fake-token',
        grantResponse: grantSession,
        ...providersArg,
      })
    ).rejects.toThrow('Email not verified by Twitter');
  });
});

describe('twitch authCallback — verified email guard', () => {
  let twitchProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    twitchProvider = providersRegistry().get('twitch');
  });

  const providersArg = { providers: { twitch: { key: 'client-id' } } };

  it('returns username and email when Twitch returns a verified email', async () => {
    mockRequest.mockResolvedValue({
      body: { data: [{ login: 'streamer', email: 'streamer@example.com' }] },
    });

    const result = await twitchProvider.authCallback({
      accessToken: 'fake-token',
      ...providersArg,
    });

    expect(result).toEqual({ username: 'streamer', email: 'streamer@example.com' });
  });

  it('throws when Twitch does not return an email', async () => {
    mockRequest.mockResolvedValue({ body: { data: [{ login: 'streamer' }] } });

    await expect(
      twitchProvider.authCallback({ accessToken: 'fake-token', ...providersArg })
    ).rejects.toThrow('Email not verified by Twitch');
  });
});

describe('linkedin authCallback — verified email guard', () => {
  let linkedinProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    linkedinProvider = providersRegistry().get('linkedin');
  });

  it('returns username and email when LinkedIn returns an email address', async () => {
    mockRequest
      .mockResolvedValueOnce({ body: { localizedFirstName: 'John' } })
      .mockResolvedValueOnce({
        body: { elements: [{ 'handle~': { emailAddress: 'john@example.com' } }] },
      });

    const result = await linkedinProvider.authCallback({ accessToken: 'fake-token' });

    expect(result).toEqual({ username: 'John', email: 'john@example.com' });
  });

  it('throws when LinkedIn does not return an email address', async () => {
    mockRequest
      .mockResolvedValueOnce({ body: { localizedFirstName: 'John' } })
      .mockResolvedValueOnce({ body: { elements: [] } });

    await expect(linkedinProvider.authCallback({ accessToken: 'fake-token' })).rejects.toThrow(
      'Email not verified by LinkedIn'
    );
  });
});

describe('cas authCallback — verified email guard', () => {
  let casProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    casProvider = providersRegistry().get('cas');
  });

  const providersArg = { providers: { cas: { subdomain: 'cas.example.com/cas' } } };

  it('returns username and email when email_verified is true', async () => {
    mockRequest.mockResolvedValue({
      body: {
        sub: 'user-1',
        email: 'john@example.com',
        email_verified: true,
      },
    });

    const result = await casProvider.authCallback({ accessToken: 'fake-token', ...providersArg });

    expect(result).toEqual({ username: 'user-1', email: 'john@example.com' });
  });

  it('throws when email_verified is false', async () => {
    mockRequest.mockResolvedValue({
      body: {
        sub: 'attacker',
        email: 'victim@example.com',
        email_verified: false,
      },
    });

    await expect(
      casProvider.authCallback({ accessToken: 'fake-token', ...providersArg })
    ).rejects.toThrow('Email not verified by CAS');
  });
});

describe('vk authCallback — server-side OAuth session guard', () => {
  let vkProvider;
  let mockRequest;

  beforeAll(() => {
    mockRequest = jest.fn();
    setRequestMock(mockRequest);
    vkProvider = providersRegistry().get('vk');
  });

  const grantSession = {
    raw: { email: 'john@example.com', user_id: '12345' },
  };

  it('returns username and email from the grant session token response', async () => {
    mockRequest.mockResolvedValue({
      body: { response: [{ first_name: 'John', last_name: 'Doe' }] },
    });

    const result = await vkProvider.authCallback({
      accessToken: 'real-vk-token',
      grantResponse: grantSession,
    });

    expect(result).toEqual({ username: 'Doe John', email: 'john@example.com' });
  });

  it('rejects forged query email without a grant session (the reported attack shape)', async () => {
    await expect(
      vkProvider.authCallback({
        accessToken: 'fake-token',
        query: { raw: { email: 'victim@example.com', user_id: '99999' } },
      })
    ).rejects.toThrow('VK authentication requires a completed OAuth session');
  });

  it('rejects when the grant session has no email', async () => {
    await expect(
      vkProvider.authCallback({
        accessToken: 'fake-token',
        grantResponse: { raw: { user_id: '12345' } },
      })
    ).rejects.toThrow('VK authentication requires a completed OAuth session');
  });

  it('rejects when the access token does not resolve to a VK user', async () => {
    mockRequest.mockResolvedValue({ body: { response: [] } });

    await expect(
      vkProvider.authCallback({
        accessToken: 'invalid-token',
        grantResponse: grantSession,
      })
    ).rejects.toThrow('Invalid VK access token');
  });
});
