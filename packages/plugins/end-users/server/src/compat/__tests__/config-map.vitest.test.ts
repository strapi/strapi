import { describe, expect, it } from 'vitest';

import { UP_CONFIG_MAP } from '../config-map';

const KEYS = Object.keys(UP_CONFIG_MAP);

describe('UP_CONFIG_MAP', () => {
  it('has an entry for exactly the Users & Permissions config keys, and a null target says why', () => {
    const upKeys = [
      'jwtSecret',
      'jwt',
      'jwtManagement',
      'sessions.accessTokenLifespan',
      'sessions.maxRefreshTokenLifespan',
      'sessions.idleRefreshTokenLifespan',
      'sessions.maxSessionLifespan',
      'sessions.idleSessionLifespan',
      'sessions.httpOnly',
      'sessions.cookie.name',
      'sessions.cookie.secure',
      'sessions.cookie.sameSite',
      'sessions.cookie.path',
      'sessions.cookie.domain',
      'sessions.cookie.maxAge',
      'ratelimit.enabled',
      'ratelimit.interval',
      'ratelimit.max',
      'layout',
      'callback.validate',
      'register.allowedFields',
      'validationRules.validatePassword',
    ];
    // Not keys of Users & Permissions: its `ratelimit` object is handed to the rate limiter
    const passedThrough = [
      'ratelimit.delayAfter',
      'ratelimit.timeWait',
      'ratelimit.prefixKey',
      'ratelimit.whitelist',
      'ratelimit.store',
    ];

    expect([...KEYS].sort()).toEqual([...upKeys, ...passedThrough].sort());

    for (const key of passedThrough) {
      expect(UP_CONFIG_MAP[key].note).toMatch(/passed through to the rate limiter/i);
    }

    expect(UP_CONFIG_MAP.jwtManagement.note).toContain("'legacy-support'");

    for (const entry of Object.values(UP_CONFIG_MAP)) {
      expect(entry.note.length).toBeGreaterThan(0);
    }

    expect(Object.values(UP_CONFIG_MAP).filter((entry) => entry.target === null)).not.toHaveLength(
      0
    );
  });

  it('points every target at a key of the compat group or of the plugin configuration', () => {
    const targets = Object.values(UP_CONFIG_MAP)
      .map((entry) => entry.target)
      .filter((target): target is string => target !== null);

    for (const target of targets) {
      expect(target).toMatch(/^(compat|rateLimit|session)\./);
    }
  });
});
