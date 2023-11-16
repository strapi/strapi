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

export { default as admin } from './admin';
export { default as dataTransfer } from './data-transfer';
export { default as apiToken } from './api-token';
