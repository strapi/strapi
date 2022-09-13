'use strict';

/**
 * @typedef {{authenticated: boolean, error?: string, credentials?: Record<any, any>}} AuthenticateResponse
 * @typedef {(ctx: Record<any, any>) => AuthenticateResponse | Promise<AuthenticateResponse>} AuthenticateFunction
 * @typedef {{strategy: AuthStrategy, credentials?: Record<any, any>}} VerifyInputAuth
 * @typedef {{scope: string, [key: any]: any}} VerifyInputConfig
 * @typedef {(auth: VerifyInputAuth, config: VerifyInputConfig) => void | Promise<void>} VerifyFunction
 */

/**
 * @typedef AuthStrategy
 *
 * @property {string} name
 * @property {AuthenticateFunction} authenticate
 * @property {VerifyFunction} [verify]
 */

/**
 * @type {Record<string, AuthStrategy>}
 */
module.exports = {
  admin: require('./admin'),
  'api-token': require('./api-token'),
};
