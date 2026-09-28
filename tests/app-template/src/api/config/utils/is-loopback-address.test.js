'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const isLoopbackAddress = require('./is-loopback-address');

describe('isLoopbackAddress', () => {
  it('accepts IPv4, IPv6, and IPv4-mapped loopback peers', () => {
    assert.equal(isLoopbackAddress('127.0.0.1'), true);
    assert.equal(isLoopbackAddress('127.10.20.30'), true);
    assert.equal(isLoopbackAddress('::1'), true);
    assert.equal(isLoopbackAddress('0:0:0:0:0:0:0:1'), true);
    assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  });

  it('rejects missing, wildcard, private-network, public, and mapped non-loopback peers', () => {
    assert.equal(isLoopbackAddress(undefined), false);
    assert.equal(isLoopbackAddress('0.0.0.0'), false);
    assert.equal(isLoopbackAddress('192.168.1.10'), false);
    assert.equal(isLoopbackAddress('203.0.113.10'), false);
    assert.equal(isLoopbackAddress('::ffff:192.168.1.10'), false);
  });
});
