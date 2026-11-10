import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { PENDING_LINK_PREFIX, pendingLinkIdentifier, pendingLinkPrefix } from '../pending-link';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

describe('pendingLinkIdentifier', () => {
  it('names the provider and the address, which it holds as a hash', () => {
    const identifier = pendingLinkIdentifier('keycloak', 'erin@example.com');

    expect(identifier).toBe(`${PENDING_LINK_PREFIX}keycloak:${sha256('erin@example.com')}`);
    expect(identifier).not.toContain('erin');
    expect(identifier.startsWith(pendingLinkPrefix('keycloak'))).toBe(true);
  });

  it('is the same for an address in other capitals or with spaces around it', () => {
    expect(pendingLinkIdentifier('keycloak', ' Erin@Example.COM ')).toBe(
      pendingLinkIdentifier('keycloak', 'erin@example.com')
    );
  });

  it('differs by provider, and a provider id cannot reach into another`s prefix', () => {
    expect(pendingLinkIdentifier('github', 'erin@example.com')).not.toBe(
      pendingLinkIdentifier('keycloak', 'erin@example.com')
    );
    // A `:` in an id is escaped, so `a:b`'s links never start with `a:`'s prefix
    expect(
      pendingLinkIdentifier('a:b', 'erin@example.com').startsWith(pendingLinkPrefix('a'))
    ).toBe(false);
  });

  it('stays short whatever the address, for the indexed column', () => {
    expect(pendingLinkIdentifier('keycloak', `${'x'.repeat(240)}@example.com`).length).toBeLessThan(
      120
    );
  });
});
