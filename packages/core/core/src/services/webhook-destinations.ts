/**
 * Optional restrictions on where webhooks can be sent, set in `server.webhooks.destinationChecks`.
 *
 * Every check is off by default: a webhook can point at any URL the server can reach, including
 * localhost and private networks. Operators who want to limit that can turn checks on. They are a
 * convenience, not a security boundary: anyone allowed to manage webhooks chooses where they go.
 */
import dns from 'node:dns';
import net from 'node:net';
import type { Core, Modules } from '@strapi/types';
import type { Dispatcher } from 'undici';
// Imported from their own files, as in utils/fetch.ts, which explains why
/* eslint-disable import/extensions -- required by the ESM build: undici has no exports map */
import Agent from 'undici/lib/dispatcher/agent.js';
import Dispatcher1Wrapper from 'undici/lib/dispatcher/dispatcher1-wrapper.js';
import buildConnector from 'undici/lib/core/connect.js';
/* eslint-enable import/extensions */

import {
  classifyAddress,
  getOwnAddresses,
  normalizeAddress,
  type AddressCategory,
} from '../utils/address-ranges';

type BlockedDestination = Modules.WebhookRunner.BlockedDestination;

export type DestinationChecks = Required<Core.Config.WebhookDestinationChecks>;

type RedirectMode = DestinationChecks['redirects'];

/**
 * Resolves every address of a hostname, like `dns.promises.lookup` with `all: true`.
 */
export type Lookup = (
  hostname: string,
  options?: Pick<dns.LookupOptions, 'family' | 'hints'>
) => Promise<dns.LookupAddress[]>;

const CONFIG_KEY = 'server.webhooks.destinationChecks';

const RANGE_CHECKS: AddressCategory[] = ['loopback', 'privateNetworks', 'linkLocal'];
const REDIRECT_MODES: RedirectMode[] = ['follow', 'check', 'none'];

export const DEFAULT_DESTINATION_CHECKS: DestinationChecks = {
  loopback: false,
  privateNetworks: false,
  linkLocal: false,
  onSend: false,
  redirects: 'follow',
};

/**
 * Reads `server.webhooks.destinationChecks` and fills in the defaults. Throws on unknown options
 * and invalid values, so that a typo doesn't leave a check off without anyone noticing.
 */
export const parseDestinationChecks = (config: unknown = {}): DestinationChecks => {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error(`${CONFIG_KEY} must be an object`);
  }

  const unknownKey = Object.keys(config).find(
    (key) => !Object.hasOwn(DEFAULT_DESTINATION_CHECKS, key)
  );

  if (unknownKey) {
    throw new Error(`Unknown option ${CONFIG_KEY}.${unknownKey}`);
  }

  const checks = { ...DEFAULT_DESTINATION_CHECKS, ...config };

  [...RANGE_CHECKS, 'onSend' as const].forEach((key) => {
    if (typeof checks[key] !== 'boolean') {
      throw new Error(`${CONFIG_KEY}.${key} must be true or false`);
    }
  });

  if (!REDIRECT_MODES.includes(checks.redirects)) {
    throw new Error(`${CONFIG_KEY}.redirects must be 'follow', 'check' or 'none'`);
  }

  return checks;
};

const describeBlocked = (hostname: string, address: string, check: AddressCategory) => {
  const option = `${CONFIG_KEY}.${check}`;
  // Says why loopback blocks an address outside its ranges
  const isOwn =
    check === 'loopback' && !classifyAddress(address, { ownAddresses: [] }).includes('loopback');
  const own = isOwn ? ", one of this server's own addresses" : '';
  const blocked = net.isIP(hostname)
    ? `${option} blocks ${address}${own}.`
    : `${hostname} resolves to ${address}${own}, which ${option} blocks.`;

  return `${blocked} Turn that option off to allow it.`;
};

/**
 * Thrown when a webhook would connect to an address that one of the checks blocks.
 */
export class DestinationBlockedError extends Error {
  readonly destination: BlockedDestination;

  constructor(destination: BlockedDestination) {
    super(destination.message);
    this.name = 'DestinationBlockedError';
    this.destination = destination;
  }
}

/**
 * Finds a DestinationBlockedError in an error or its causes: fetch wraps connection errors.
 */
export const findDestinationBlockedError = (
  error: unknown
): DestinationBlockedError | undefined => {
  let current = error;

  while (current instanceof Error) {
    if (current instanceof DestinationBlockedError) {
      return current;
    }

    current = current.cause;
  }

  return undefined;
};

const systemLookup: Lookup = (hostname, options = {}) =>
  dns.promises.lookup(hostname, { ...options, all: true });

export const createDestinationChecker = (
  checks: DestinationChecks,
  { lookup = systemLookup }: { lookup?: Lookup } = {}
) => {
  const enabled = RANGE_CHECKS.filter((check) => checks[check]);

  /**
   * Returns what blocks the first blocked address, if any.
   */
  const findBlocked = (hostname: string, addresses: string[]): BlockedDestination | undefined => {
    if (enabled.length === 0) {
      return undefined;
    }

    const ownAddresses = getOwnAddresses();

    for (const address of addresses) {
      const check = classifyAddress(address, { ownAddresses }).find((category) =>
        enabled.includes(category)
      );

      if (check) {
        const message = describeBlocked(hostname, address, check);

        return { hostname, address, check, message };
      }
    }

    return undefined;
  };

  /**
   * Resolves every address of the hostname, and blocks it when any of them is blocked. A hostname
   * that doesn't resolve has no address to check, so it is allowed.
   */
  const checkHostname = async (value: string): Promise<BlockedDestination | undefined> => {
    if (enabled.length === 0) {
      return undefined;
    }

    const hostname = value.replace(/^\[(.*)\]$/, '$1');

    if (normalizeAddress(hostname)) {
      return findBlocked(hostname, [hostname]);
    }

    let addresses: dns.LookupAddress[];

    try {
      addresses = await lookup(hostname);
    } catch {
      return undefined;
    }

    return findBlocked(
      hostname,
      addresses.map(({ address }) => address)
    );
  };

  const checkUrl = async (url: string | URL): Promise<BlockedDestination | undefined> => {
    let hostname: string;

    try {
      hostname = new URL(url).hostname;
    } catch {
      return undefined;
    }

    return checkHostname(hostname);
  };

  return {
    checks,
    /**
     * Whether any address check is on. onSend and redirects: 'check' do nothing without one.
     */
    isActive: enabled.length > 0,
    lookup,
    findBlocked,
    checkUrl,
  };
};

export type DestinationChecker = ReturnType<typeof createDestinationChecker>;

/**
 * Creates a dispatcher for fetch that checks the address of every connection it opens, once the
 * hostname is resolved. The check applies to the address actually connected to, including after a
 * DNS change since the webhook was saved, or after a redirect.
 *
 * Don't use it behind a proxy: its connections go to the proxy, which resolves the destination.
 */
export const createCheckingDispatcher = (checker: DestinationChecker): Dispatcher => {
  const lookup: net.LookupFunction = (hostname, options, callback) => {
    const family = options.family ? Number(options.family) : 0;

    checker.lookup(hostname, { family, hints: options.hints }).then(
      (addresses) => {
        const blocked = checker.findBlocked(
          hostname,
          addresses.map(({ address }) => address)
        );

        if (blocked) {
          callback(new DestinationBlockedError(blocked), '', 0);
        } else if (addresses.length === 0) {
          callback(
            Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' }),
            '',
            0
          );
        } else if (options.all) {
          callback(null, addresses);
        } else {
          callback(null, addresses[0].address, addresses[0].family);
        }
      },
      (error) => callback(error, '', 0)
    );
  };

  const connector = buildConnector({ lookup });

  // Connecting to an IP address skips the lookup, so those are checked here
  const connect: buildConnector.connector = (options, callback) => {
    const blocked = net.isIP(options.hostname)
      ? checker.findBlocked(options.hostname, [options.hostname])
      : undefined;

    if (blocked) {
      callback(new DestinationBlockedError(blocked), null);
      return;
    }

    connector(options, callback);
  };

  // See utils/fetch.ts for why the wrapper is needed with Node's fetch
  return new Dispatcher1Wrapper(new Agent({ connect }));
};
