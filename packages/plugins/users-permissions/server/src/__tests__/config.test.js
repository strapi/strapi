import { describe, expect, it } from 'vitest';

import config from '../config';

describe('OAuth callback configuration', () => {
  const { callback } = config.default({ env: () => undefined });
  const provider = { callback: 'https://client.example/auth/callback' };

  it('allows callback-specific state without changing the destination', () => {
    expect(() => callback.validate(`${provider.callback}?state=one#two`, provider)).not.toThrow();
  });

  it.each([
    ['not a URL', 'not a valid URL'],
    ['https://attacker.example/auth/callback', "origins don't match"],
    ['http://client.example/auth/callback', "origins don't match"],
    ['https://client.example/other', "pathname don't match"],
  ])('rejects an unsafe callback %s', (url, message) => {
    expect(() => callback.validate(url, provider)).toThrow(message);
  });

  it('rejects an invalid configured callback', () => {
    expect(() => callback.validate(provider.callback, { callback: '/relative' })).toThrow(
      'not a valid URL'
    );
  });
});
