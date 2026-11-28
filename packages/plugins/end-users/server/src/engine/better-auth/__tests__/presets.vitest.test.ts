import { describe, expect, it } from 'vitest';

import { resolvePreset } from '../presets';

describe('resolvePreset', () => {
  it('leaves a config that names no preset as it is', () => {
    const config = { providerId: 'mine', clientId: 'id' };

    expect(resolvePreset(config)).toBe(config);
  });

  it("builds the preset's config, keeping the definition's id and toggle", () => {
    const config = resolvePreset({
      pkce: true,
      strapiPreset: {
        name: 'okta',
        options: {
          clientId: 'id',
          clientSecret: 's',
          issuer: 'https://dev-1.okta.com/oauth2/default/',
        },
      },
      overrideUserInfo: false,
      providerId: 'okta',
    }) as Record<string, unknown>;

    expect(config).toMatchObject({
      discoveryUrl: 'https://dev-1.okta.com/oauth2/default/.well-known/openid-configuration',
      clientId: 'id',
      clientSecret: 's',
      scopes: ['openid', 'profile', 'email'],
      overrideUserInfo: false,
      providerId: 'okta',
    });
    expect(config).not.toHaveProperty('strapiPreset');
  });

  it('gives scopes replace the preset defaults', () => {
    expect(
      resolvePreset({
        strapiPreset: {
          name: 'okta',
          options: {
            clientId: 'i',
            clientSecret: 's',
            issuer: 'https://x.okta.com',
            scopes: ['groups'],
          },
        },
        providerId: 'okta',
      })
    ).toMatchObject({ scopes: ['groups'] });
  });

  it('refuses a name that is not a preset', () => {
    expect(() => resolvePreset({ strapiPreset: { name: 'constructor', options: {} } })).toThrow(
      /not a generic OAuth preset/
    );
  });
});
