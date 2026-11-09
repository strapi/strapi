import net from 'node:net';
import os from 'node:os';
import type { Modules } from '@strapi/types';

/**
 * The address categories an operator can block webhooks from sending to, named after their
 * `server.webhooks.destinationChecks` options.
 */
export type AddressCategory = Modules.WebhookRunner.BlockedDestination['check'];

type Subnet = [address: string, prefix: number];

/**
 * The ranges in each category. The Webhooks page of the user documentation (docs.strapi.io) lists
 * them, keep both in sync.
 *
 * An address can be in more than one category: 100.100.100.200 is a cloud metadata address
 * (linkLocal) inside 100.64.0.0/10 (privateNetworks).
 */
const ADDRESS_RANGES: Record<AddressCategory, { ipv4: Subnet[]; ipv6: Subnet[] }> = {
  loopback: {
    ipv4: [
      ['127.0.0.0', 8], // loopback
      ['0.0.0.0', 8], // "this network", 0.0.0.0 reaches the local host
    ],
    ipv6: [
      ['::1', 128], // loopback
      ['::', 128], // unspecified
    ],
  },
  privateNetworks: {
    ipv4: [
      ['10.0.0.0', 8], // private-use (RFC 1918)
      ['172.16.0.0', 12], // private-use (RFC 1918)
      ['192.168.0.0', 16], // private-use (RFC 1918)
      ['100.64.0.0', 10], // shared address space, carrier-grade NAT and some VPNs (RFC 6598)
      ['192.0.0.0', 24], // IETF protocol assignments (RFC 6890)
      ['198.18.0.0', 15], // benchmarking (RFC 2544)
      ['240.0.0.0', 4], // reserved, used by some networks as extra private space
    ],
    ipv6: [
      ['fc00::', 7], // unique local (RFC 4193)
      ['fec0::', 10], // site-local, deprecated (RFC 3879)
      ['64:ff9b:1::', 48], // local-use NAT64 (RFC 8215)
    ],
  },
  linkLocal: {
    ipv4: [
      ['169.254.0.0', 16], // link-local, which includes most cloud metadata services
      ['168.63.129.16', 32], // Azure platform services
      ['100.100.100.200', 32], // Alibaba Cloud metadata
      ['192.0.0.192', 32], // Oracle Cloud Classic metadata
    ],
    ipv6: [
      ['fe80::', 10], // link-local
      ['fd00:ec2::254', 128], // AWS metadata over IPv6
    ],
  },
};

const CATEGORIES = Object.keys(ADDRESS_RANGES) as AddressCategory[];

const blockLists = Object.fromEntries(
  CATEGORIES.map((category) => {
    const blockList = new net.BlockList();
    const { ipv4, ipv6 } = ADDRESS_RANGES[category];

    ipv4.forEach(([address, prefix]) => blockList.addSubnet(address, prefix, 'ipv4'));
    ipv6.forEach(([address, prefix]) => blockList.addSubnet(address, prefix, 'ipv6'));

    return [category, blockList];
  })
) as Record<AddressCategory, net.BlockList>;

/**
 * Expands a valid IPv6 address into its 8 groups of 16 bits.
 */
const toGroups = (address: string): number[] => {
  let text = address;

  // A trailing IPv4 address, as in ::ffff:127.0.0.1, is the last two groups
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);

  if (tail.includes('.')) {
    const [a, b, c, d] = tail.split('.').map(Number);
    const high = (a * 256 + b).toString(16);
    const low = (c * 256 + d).toString(16);

    text = `${text.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const [head, rest] = text.split('::');
  const toNumbers = (part: string) =>
    part ? part.split(':').map((group) => parseInt(group, 16)) : [];

  if (rest === undefined) {
    return toNumbers(head);
  }

  const start = toNumbers(head);
  const end = toNumbers(rest);

  return [...start, ...new Array(8 - start.length - end.length).fill(0), ...end];
};

const isZero = (groups: number[]) => groups.every((group) => group === 0);

const toIPv4 = (high: number, low: number) =>
  [Math.floor(high / 256), high % 256, Math.floor(low / 256), low % 256].join('.');

/**
 * The IPv4 address an IPv6 address carries, for the encodings that reach it: IPv4-mapped
 * (::ffff:a.b.c.d), IPv4-translated (::ffff:0:a.b.c.d), IPv4-compatible (::a.b.c.d),
 * NAT64 (64:ff9b::a.b.c.d) and 6to4 (2002:aabb:ccdd::).
 */
const getEmbeddedIPv4 = (groups: number[]): string | undefined => {
  const isMapped = isZero(groups.slice(0, 5)) && groups[5] === 0xffff;
  const isTranslated = isZero(groups.slice(0, 4)) && groups[4] === 0xffff && groups[5] === 0;
  const isCompatible = isZero(groups.slice(0, 6)) && (groups[6] !== 0 || groups[7] > 1);
  const isNat64 = groups[0] === 0x64 && groups[1] === 0xff9b && isZero(groups.slice(2, 6));

  if (isMapped || isTranslated || isCompatible || isNat64) {
    return toIPv4(groups[6], groups[7]);
  }

  if (groups[0] === 0x2002) {
    return toIPv4(groups[1], groups[2]);
  }

  return undefined;
};

/**
 * Normalizes an IP address so that every way of writing it is checked the same way: removes
 * brackets and zone ids, and turns IPv6 addresses that carry an IPv4 address into that address.
 *
 * Other IPv4 encodings, such as 2130706433 or 0x7f.1 for 127.0.0.1, need no work here: URL
 * parsing turns them into dotted decimal before the hostname is read.
 *
 * Returns undefined when the value isn't an IP address.
 */
export const normalizeAddress = (
  value: string
): { address: string; family: 'ipv4' | 'ipv6' } | undefined => {
  const address = value.replace(/^\[(.*)\]$/, '$1').replace(/%.*$/, '');

  if (net.isIPv4(address)) {
    return { address, family: 'ipv4' };
  }

  if (!net.isIPv6(address)) {
    return undefined;
  }

  const groups = toGroups(address);
  const ipv4 = getEmbeddedIPv4(groups);

  if (ipv4) {
    return { address: ipv4, family: 'ipv4' };
  }

  return { address: groups.map((group) => group.toString(16)).join(':'), family: 'ipv6' };
};

/**
 * The addresses of the server's own network interfaces.
 */
export const getOwnAddresses = (): string[] =>
  Object.values(os.networkInterfaces()).flatMap((addresses = []) =>
    addresses.map(({ address }) => address)
  );

/**
 * Whether an IP address is one of the server's own addresses, however it is written.
 */
const isOwnAddress = (value: string, ownAddresses = getOwnAddresses()) => {
  const address = normalizeAddress(value)?.address;

  return (
    address !== undefined && ownAddresses.some((own) => normalizeAddress(own)?.address === address)
  );
};

/**
 * Lists the categories an IP address belongs to. The server's own interface addresses count as
 * loopback, since a request to them reaches the server itself.
 */
export const classifyAddress = (
  value: string,
  { ownAddresses = getOwnAddresses() }: { ownAddresses?: string[] } = {}
): AddressCategory[] => {
  const normalized = normalizeAddress(value);

  if (!normalized) {
    return [];
  }

  const { address, family } = normalized;
  const categories = CATEGORIES.filter((category) => blockLists[category].check(address, family));

  if (!categories.includes('loopback') && isOwnAddress(value, ownAddresses)) {
    categories.unshift('loopback');
  }

  return categories;
};
