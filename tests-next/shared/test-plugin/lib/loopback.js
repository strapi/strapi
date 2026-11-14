'use strict';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * True when the request comes from this machine. Uses the socket address, not `ctx.request.ip`,
 * which honours `X-Forwarded-For` when the app trusts a proxy.
 *
 * @param {string | undefined} address
 */
const isLoopbackAddress = (address) =>
  typeof address === 'string' && LOOPBACK_ADDRESSES.has(address);

module.exports = { isLoopbackAddress };
