import os from 'node:os';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createDestinationChecker,
  DEFAULT_DESTINATION_CHECKS,
  DestinationBlockedError,
  findDestinationBlockedError,
  parseDestinationChecks,
  type DestinationChecks,
  type Lookup,
} from '../webhook-destinations';

// Hostnames used in these tests, and the addresses the stubbed lookup gives them
const DNS: Record<string, string[]> = {
  'hook.test': ['127.0.0.1'],
  'public.test': ['93.184.216.34'],
  'internal.test': ['93.184.216.34', '10.0.0.5'],
  'metadata.test': ['100.100.100.200'],
  'mapped.test': ['::ffff:10.0.0.5'],
};

const lookup = vi.fn<Lookup>(async (hostname) => {
  const addresses = DNS[hostname];

  if (!addresses) {
    throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' });
  }

  return addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
});

const createChecker = (checks: Partial<DestinationChecks> = {}) =>
  createDestinationChecker({ ...DEFAULT_DESTINATION_CHECKS, ...checks }, { lookup });

beforeEach(() => {
  lookup.mockClear();
});

describe('parseDestinationChecks', () => {
  test('turns every check off by default and follows redirects', () => {
    expect(parseDestinationChecks()).toEqual({
      blockLoopback: false,
      blockPrivateNetworks: false,
      blockLinkLocal: false,
      checkOnSend: false,
      redirects: 'follow',
    });
  });

  test('keeps the options that are set', () => {
    expect(parseDestinationChecks({ blockPrivateNetworks: true, redirects: 'check' })).toEqual({
      ...DEFAULT_DESTINATION_CHECKS,
      blockPrivateNetworks: true,
      redirects: 'check',
    });
  });

  test('rejects unknown options, so that a typo does not leave a check off', () => {
    expect(() => parseDestinationChecks({ privateNetwork: true })).toThrow(
      'Unknown option server.webhooks.destinationChecks.privateNetwork'
    );
  });

  test('rejects invalid values', () => {
    expect(() => parseDestinationChecks({ blockLoopback: 'yes' })).toThrow(
      'server.webhooks.destinationChecks.blockLoopback must be true or false'
    );
    expect(() => parseDestinationChecks({ redirects: 'manual' })).toThrow(
      "server.webhooks.destinationChecks.redirects must be 'follow', 'check' or 'none'"
    );
    expect(() => parseDestinationChecks(true)).toThrow(
      'server.webhooks.destinationChecks must be an object'
    );
  });
});

describe('createDestinationChecker', () => {
  test('allows every URL by default, without resolving it', async () => {
    const checker = createChecker();

    expect(checker.isActive).toBe(false);
    await expect(checker.checkUrl('http://127.0.0.1:1337/hook')).resolves.toBeUndefined();
    await expect(checker.checkUrl('http://internal.test/hook')).resolves.toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });

  test('blocks an IP address in an enabled range, and says which option to turn off', async () => {
    const checker = createChecker({ blockLoopback: true });

    await expect(checker.checkUrl('http://127.0.0.1:1337/hook')).resolves.toEqual({
      hostname: '127.0.0.1',
      address: '127.0.0.1',
      option: 'blockLoopback',
      message:
        'server.webhooks.destinationChecks.blockLoopback blocks 127.0.0.1. Set it to false to allow it.',
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  test('checks other ways of writing an address', async () => {
    const checker = createChecker({ blockLoopback: true });

    await expect(checker.checkUrl('http://[::1]/')).resolves.toMatchObject({ address: '::1' });
    await expect(checker.checkUrl('http://[::ffff:127.0.0.1]/')).resolves.toMatchObject({
      option: 'blockLoopback',
    });
    await expect(checker.checkUrl('http://2130706433/')).resolves.toMatchObject({
      address: '127.0.0.1',
    });
    await expect(checker.checkUrl('http://0x7f.1/')).resolves.toMatchObject({
      address: '127.0.0.1',
    });
  });

  test('blocks a hostname when any of its addresses is blocked', async () => {
    const checker = createChecker({ blockPrivateNetworks: true });

    await expect(checker.checkUrl('https://internal.test/hook')).resolves.toEqual({
      hostname: 'internal.test',
      address: '10.0.0.5',
      option: 'blockPrivateNetworks',
      message:
        'internal.test resolves to 10.0.0.5, which server.webhooks.destinationChecks.blockPrivateNetworks blocks. Set it to false to allow it.',
    });
    await expect(checker.checkUrl('https://mapped.test/hook')).resolves.toMatchObject({
      address: '::ffff:10.0.0.5',
      option: 'blockPrivateNetworks',
    });
  });

  test("says when an address is one of the server's own", async () => {
    const networkInterfaces = vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      eth0: [
        {
          address: '93.184.216.34',
          netmask: '255.255.255.0',
          family: 'IPv4',
          mac: '00:00:00:00:00:00',
          internal: false,
          cidr: '93.184.216.34/24',
        },
      ],
    });

    try {
      await expect(
        createChecker({ blockLoopback: true }).checkUrl('http://public.test/')
      ).resolves.toMatchObject({
        option: 'blockLoopback',
        message:
          "public.test resolves to 93.184.216.34, one of this server's own addresses, which server.webhooks.destinationChecks.blockLoopback blocks. Set it to false to allow it.",
      });
    } finally {
      networkInterfaces.mockRestore();
    }
  });

  test('only applies the checks that are on', async () => {
    const checker = createChecker({ blockPrivateNetworks: true });

    await expect(checker.checkUrl('http://127.0.0.1/')).resolves.toBeUndefined();
    await expect(checker.checkUrl('http://hook.test/')).resolves.toBeUndefined();
    await expect(checker.checkUrl('http://169.254.169.254/')).resolves.toBeUndefined();
    await expect(checker.checkUrl('http://public.test/')).resolves.toBeUndefined();
  });

  test('names the check that is on when an address is in two categories', async () => {
    await expect(
      createChecker({ blockLinkLocal: true }).checkUrl('http://metadata.test/')
    ).resolves.toMatchObject({ option: 'blockLinkLocal' });
    await expect(
      createChecker({ blockPrivateNetworks: true }).checkUrl('http://metadata.test/')
    ).resolves.toMatchObject({ option: 'blockPrivateNetworks' });
  });

  test('allows a hostname that does not resolve, since it has no address to check', async () => {
    const checker = createChecker({
      blockLoopback: true,
      blockPrivateNetworks: true,
      blockLinkLocal: true,
    });

    await expect(checker.checkUrl('http://unknown.test/')).resolves.toBeUndefined();
    expect(lookup).toHaveBeenCalledWith('unknown.test');
  });
});

describe('findDestinationBlockedError', () => {
  test('finds the error in the causes fetch wraps it in', () => {
    const blocked = new DestinationBlockedError({
      hostname: 'internal.test',
      address: '10.0.0.5',
      option: 'blockPrivateNetworks',
      message: 'blocked',
    });

    expect(findDestinationBlockedError(blocked)).toBe(blocked);
    expect(findDestinationBlockedError(new TypeError('fetch failed', { cause: blocked }))).toBe(
      blocked
    );
    expect(findDestinationBlockedError(new TypeError('fetch failed'))).toBeUndefined();
  });
});
