import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { PENDING_LINK_PREFIX, pendingLinkIdentifier, pendingLinkPrefix } from '../pending-link';

// Built at run time: no secret-shaped literal in the source
const SECRET = ['the', 'engine', 'secret'].join('-');
const hmac = (text: string, key = SECRET) => createHmac('sha256', key).update(text).digest('hex');

describe('pendingLinkIdentifier', () => {
  it('cannot be computed without the secret, and another secret gives another identifier', () => {
    const identifier = pendingLinkIdentifier('keycloak', 'erin@example.com', SECRET);

    expect(identifier).not.toContain(
      createHmac('sha256', '').update('erin@example.com').digest('hex')
    );
    expect(pendingLinkIdentifier('keycloak', 'erin@example.com', `${SECRET}-rotated`)).not.toBe(
      identifier
    );
  });

  it('names the provider and the address, which it holds as a keyed hash', () => {
    const identifier = pendingLinkIdentifier('keycloak', 'erin@example.com', SECRET);

    expect(identifier).toBe(`${PENDING_LINK_PREFIX}keycloak:${hmac('erin@example.com')}`);
    expect(identifier).not.toContain('erin');
    expect(identifier.startsWith(pendingLinkPrefix('keycloak'))).toBe(true);
  });

  it('is the same for an address in other capitals or with spaces around it', () => {
    expect(pendingLinkIdentifier('keycloak', ' Erin@Example.COM ', SECRET)).toBe(
      pendingLinkIdentifier('keycloak', 'erin@example.com', SECRET)
    );
  });

  it('differs by provider, and a provider id cannot reach into another`s prefix', () => {
    expect(pendingLinkIdentifier('github', 'erin@example.com', SECRET)).not.toBe(
      pendingLinkIdentifier('keycloak', 'erin@example.com', SECRET)
    );
    // A `:` in an id is escaped, so `a:b`'s links never start with `a:`'s prefix
    expect(
      pendingLinkIdentifier('a:b', 'erin@example.com', SECRET).startsWith(pendingLinkPrefix('a'))
    ).toBe(false);
  });

  it('stays short whatever the address, for the indexed column', () => {
    expect(
      pendingLinkIdentifier('keycloak', `${'x'.repeat(240)}@example.com`, SECRET).length
    ).toBeLessThan(120);
  });
});
