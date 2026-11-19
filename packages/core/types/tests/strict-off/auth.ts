import type { Modules } from '../../src';
import type { Equal, Expect } from './helpers';

type Strategy = Parameters<Modules.Auth.AuthenticationService['register']>[1];

// Without strict types, auth `verify` resolves to `any`, and a strategy's `verify` returns a
// promise, as on develop.
type AuthVerifyChecks = [
  Expect<Equal<Awaited<ReturnType<Modules.Auth.AuthenticationService['verify']>>, any>>,
  Expect<Equal<ReturnType<NonNullable<Strategy['verify']>>, Promise<any>>>,
];
declare const authVerifyChecks: AuthVerifyChecks;
authVerifyChecks satisfies unknown;
