// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Context } from 'koa';
import type relations from '../controllers/relations';
import type { Equal, Expect } from './assert.test';
import type { RelationsController } from './controllers';

type Implementation = typeof relations;
type Result = Awaited<ReturnType<Implementation['extractAndValidateRequestInfo']>>;
type ContractResult = Awaited<ReturnType<RelationsController['extractAndValidateRequestInfo']>>;

/**
 * Members still inferred `any`: `targetField` (route params), and `mainField` with `fieldsToSelect`
 * (stored configuration).
 */
type Untyped = 'targetField' | 'mainField' | 'fieldsToSelect';

// With strict types, extractAndValidateRequestInfo takes the contract's parameters and resolves to
// its result.
export type RelationsImplementationAssertions = [
  Expect<
    Equal<
      Parameters<Implementation['extractAndValidateRequestInfo']>,
      Parameters<RelationsController['extractAndValidateRequestInfo']>
    >
  >,
  Expect<Equal<Omit<Result, Untyped>, Omit<ContractResult, Untyped>>>,
  Expect<Equal<Result['attribute'], ContractResult['attribute']>>,
];

// With strict types, findAvailable takes the context of its contract (a validated query) and
// findExisting takes the Koa context, not `any`.
export type RelationsActionsAssertions = [
  Expect<
    Equal<
      Parameters<Implementation['findAvailable']>[0],
      Parameters<RelationsController['findAvailable']>[0]
    >
  >,
  Expect<Equal<Parameters<Implementation['findExisting']>[0], Context>>,
];
