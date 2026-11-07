import { describe, expect, it } from 'vitest';

import { UP_CONFIG_MAP } from '../config-map';

const KEYS = Object.keys(UP_CONFIG_MAP);

describe('UP_CONFIG_MAP', () => {
  it('has an entry for every U&P config key in the inventory, and a null target says why', () => {
    const exact = [
      'jwtSecret',
      'jwt',
      'jwtManagement',
      'register.allowedFields',
      'validationRules.validatePassword',
      'callback.validate',
      'layout',
    ];

    for (const key of exact) {
      expect(KEYS).toContain(key);
    }

    expect(KEYS.some((key) => key.startsWith('sessions.'))).toBe(true);
    expect(KEYS.some((key) => key.startsWith('ratelimit.'))).toBe(true);

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
