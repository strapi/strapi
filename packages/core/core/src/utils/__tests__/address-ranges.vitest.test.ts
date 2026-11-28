import os from 'node:os';
import { describe, expect, test, vi } from 'vitest';

import { classifyAddress } from '../address-ranges';

// Tests pass the server's own addresses explicitly, so the machine running them doesn't matter
const classify = (address: string, ownAddresses: string[] = []) =>
  classifyAddress(address, { ownAddresses });

describe('classifyAddress', () => {
  test.each([
    // loopback
    ['127.0.0.1', ['loopback']],
    ['127.255.255.254', ['loopback']],
    ['0.0.0.0', ['loopback']],
    ['0.1.2.3', ['loopback']],
    ['::1', ['loopback']],
    ['::', ['loopback']],
    // privateNetworks
    ['10.0.0.5', ['privateNetworks']],
    ['172.16.0.1', ['privateNetworks']],
    ['172.31.255.255', ['privateNetworks']],
    ['192.168.1.1', ['privateNetworks']],
    ['100.64.0.1', ['privateNetworks']],
    ['100.127.255.255', ['privateNetworks']],
    ['192.0.0.8', ['privateNetworks']],
    ['198.18.0.1', ['privateNetworks']],
    ['198.19.255.255', ['privateNetworks']],
    ['240.0.0.1', ['privateNetworks']],
    ['255.255.255.255', ['privateNetworks']],
    ['fc00::1', ['privateNetworks']],
    ['fd12:3456::1', ['privateNetworks']],
    ['fec0::1', ['privateNetworks']],
    // linkLocal
    ['169.254.169.254', ['linkLocal']],
    ['169.254.170.2', ['linkLocal']],
    ['168.63.129.16', ['linkLocal']],
    ['64:ff9b:1::a', ['privateNetworks']],
    ['fe80::1', ['linkLocal']],
    ['febf::1', ['linkLocal']],
    // In two categories: metadata addresses inside private ranges
    ['100.100.100.200', ['privateNetworks', 'linkLocal']],
    ['fd00:ec2::254', ['privateNetworks', 'linkLocal']],
    ['192.0.0.192', ['privateNetworks', 'linkLocal']],
  ])('%s is in %j', (address, categories) => {
    expect(classify(address)).toEqual(categories);
  });

  test.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.15.255.255',
    '172.32.0.0',
    '100.63.255.255',
    '100.128.0.0',
    '198.17.255.255',
    '198.20.0.0',
    '168.63.129.17',
    '169.253.255.255',
    '2606:4700:4700::1111',
    'fe00::1',
    'ff02::1',
  ])('%s is public', (address) => {
    expect(classify(address)).toEqual([]);
  });

  test('ignores values that are not IP addresses', () => {
    expect(classify('localhost')).toEqual([]);
    expect(classify('example.com')).toEqual([]);
    expect(classify('')).toEqual([]);
  });

  describe('IPv6 addresses that carry an IPv4 address', () => {
    test.each([
      // IPv4-mapped, dotted and hex
      ['::ffff:127.0.0.1', ['loopback']],
      ['::ffff:7f00:1', ['loopback']],
      ['::ffff:10.0.0.5', ['privateNetworks']],
      ['::ffff:a00:5', ['privateNetworks']],
      ['::ffff:169.254.169.254', ['linkLocal']],
      ['::ffff:a9fe:a9fe', ['linkLocal']],
      ['0:0:0:0:0:ffff:7f00:1', ['loopback']],
      ['::FFFF:7F00:1', ['loopback']],
      // IPv4-translated
      ['::ffff:0:127.0.0.1', ['loopback']],
      ['::ffff:0:a00:5', ['privateNetworks']],
      // IPv4-compatible
      ['::127.0.0.1', ['loopback']],
      ['::a00:5', ['privateNetworks']],
      // 6to4
      ['2002:7f00:1::', ['loopback']],
      ['2002:a9fe:a9fe::1', ['linkLocal']],
      // NAT64
      ['64:ff9b::10.0.0.5', ['privateNetworks']],
      ['64:ff9b::a9fe:a9fe', ['linkLocal']],
    ])('%s is in %j', (address, categories) => {
      expect(classify(address)).toEqual(categories);
    });

    test('a public IPv4 address stays public', () => {
      expect(classify('::ffff:8.8.8.8')).toEqual([]);
      expect(classify('64:ff9b::8.8.8.8')).toEqual([]);
      expect(classify('2002:808:808::1')).toEqual([]);
    });
  });

  test('ignores brackets and zone ids', () => {
    expect(classify('[::1]')).toEqual(['loopback']);
    expect(classify('[::ffff:7f00:1]')).toEqual(['loopback']);
    expect(classify('fe80::1%eth0')).toEqual(['linkLocal']);
  });

  describe("the server's own addresses", () => {
    test('count as loopback', () => {
      expect(classify('203.0.113.7', ['203.0.113.7'])).toEqual(['loopback']);
      expect(classify('2001:db8::7', ['2001:db8:0:0:0:0:0:7'])).toEqual(['loopback']);
      expect(classify('::ffff:203.0.113.7', ['203.0.113.7'])).toEqual(['loopback']);
    });

    test('keep their other categories', () => {
      expect(classify('10.0.0.5', ['10.0.0.5'])).toEqual(['loopback', 'privateNetworks']);
      expect(classify('127.0.0.1', ['127.0.0.1'])).toEqual(['loopback']);
    });

    test('are read from the network interfaces by default', () => {
      const networkInterfaces = vi.spyOn(os, 'networkInterfaces').mockReturnValue({
        eth0: [
          {
            address: '203.0.113.7',
            netmask: '255.255.255.0',
            family: 'IPv4',
            mac: '00:00:00:00:00:00',
            internal: false,
            cidr: '203.0.113.7/24',
          },
        ],
      });

      try {
        expect(classifyAddress('203.0.113.7')).toEqual(['loopback']);
      } finally {
        networkInterfaces.mockRestore();
      }
    });
  });
});
