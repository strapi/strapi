import type { Modules } from '../../src';
import type { Equal, Expect } from './helpers';

// Without strict types, auth `verify` resolves to `any`, as on develop.
type AuthVerifyChecks = [
  Expect<Equal<Awaited<ReturnType<Modules.Auth.AuthenticationService['verify']>>, any>>,
];
declare const authVerifyChecks: AuthVerifyChecks;
authVerifyChecks satisfies unknown;
