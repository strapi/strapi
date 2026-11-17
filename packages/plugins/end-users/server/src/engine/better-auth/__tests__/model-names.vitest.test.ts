import { describe, expect, it } from 'vitest';

import { pluralNameOf, singularNameOf } from '../model-names';

describe('singularNameOf', () => {
  it('writes a Better Auth model name in kebab case', () => {
    expect(singularNameOf('user')).toBe('user');
    expect(singularNameOf('twoFactor')).toBe('two-factor');
    expect(singularNameOf('rateLimit')).toBe('rate-limit');
    expect(singularNameOf('oauthAccessToken')).toBe('oauth-access-token');
  });

  it('names the JSON Web Key Set after one key, so that its plural is not its singular', () => {
    expect(singularNameOf('jwks')).toBe('jwk');
  });
});

describe('pluralNameOf', () => {
  it('adds an s', () => {
    expect(pluralNameOf('user')).toBe('users');
    expect(pluralNameOf('two-factor')).toBe('two-factors');
    expect(pluralNameOf('jwk')).toBe('jwks');
  });

  it('never returns the singular name, which the Content-Type Builder refuses', () => {
    expect(pluralNameOf('news')).not.toBe('news');
    expect(pluralNameOf('news')).toBe('newses');
  });
});
