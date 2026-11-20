/**
 * Type-level drift tests between the origin config that `defineOrigin` stores and its contract in
 * `@strapi/types` (`modules/session-manager.ts`), compiled by `yarn test:ts` (tsc -p
 * tsconfig.json, strict types on) and excluded from the build.
 */
import type { Algorithm } from 'jsonwebtoken';
import type { Modules } from '@strapi/types';

import type { SessionManagerConfig } from '../services/session-manager';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAssignable<TFrom, TTo> = [TFrom] extends [TTo] ? true : false;

type Contract = Modules.SessionManager.SessionOriginConfig;

// A config the contract accepts is one the implementation stores, and the other way around.
// `algorithm` is the `jsonwebtoken` union that signs and verifies the tokens.
export type SessionOriginConfigAssertions = [
  Expect<IsAssignable<Contract, SessionManagerConfig>>,
  Expect<IsAssignable<SessionManagerConfig, Contract>>,
  Expect<Equal<Contract['algorithm'], Algorithm | undefined>>,
  Expect<Equal<keyof Contract, keyof SessionManagerConfig>>,
];
