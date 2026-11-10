// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type relations from '../controllers/relations';
import type { Equal, Expect } from './assert.test';
import type { RelationsController } from './controllers';

type Implementation = typeof relations;
type Result = Awaited<ReturnType<Implementation['extractAndValidateRequestInfo']>>;
type ContractResult = Awaited<ReturnType<RelationsController['extractAndValidateRequestInfo']>>;

/**
 * Members still inferred `any`: `attribute` (its morph target check cannot narrow the relation
 * union), `targetField` (route params), and `mainField` with `fieldsToSelect` (stored configuration).
 */
type Untyped = 'attribute' | 'targetField' | 'mainField' | 'fieldsToSelect';

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
  Expect<Equal<Result['attribute'], any>>,
];
