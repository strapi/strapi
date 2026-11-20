import type { Core, Modules } from '../../src';
import type { Equal, Expect } from './helpers';

// Without strict types, the `defineOrigin` config keeps develop's `any`.
type IsAny<T> = 0 extends 1 & T ? true : false;
type DefineOriginConfig = Parameters<
  Modules.SessionManager.SessionManagerService['defineOrigin']
>[1];
declare const defineOriginChecks: [Expect<IsAny<DefineOriginConfig>>];
defineOriginChecks satisfies unknown;

// Without strict types, the admin auth configs keep develop's algorithm: `string` in
// `admin.auth.sessions.options`, and the index signature's `unknown` in `admin.auth.options`.
type AuthOptions = NonNullable<Core.Config.Admin['auth']['options']>;
type AuthSessionsOptions = NonNullable<
  NonNullable<Core.Config.Admin['auth']['sessions']>['options']
>;
declare const adminAlgorithmChecks: [
  Expect<Equal<AuthOptions, { expiresIn?: string | number; [key: string]: unknown }>>,
  Expect<Equal<AuthSessionsOptions, { algorithm?: string; [key: string]: unknown }>>,
];
adminAlgorithmChecks satisfies unknown;
