import type { Schema } from '@strapi/types';

// Compile-only assertions shared by this package's type tests. The server tsconfig includes this
// file; declaration builds exclude `*.test.ts`, and the test runners only collect `__tests__`.
// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
export type Equal<T, U> =
  (<V>() => V extends [T] ? 1 : 2) extends <V>() => V extends [U] ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;

// Negative control for `Equal` itself: TypeScript's error type (an unresolved type, printed as
// `any`) must not satisfy an unrelated pin. The probe is the error type today (CMS-2613, F1); if
// that gets fixed, the probe turns concrete and this assert passes vacuously: re-point it at
// another error-type source or remove it.
type ErrorTypeProbe = Schema.Attribute.Value<Schema.Attribute.AnyAttribute>;
export type HelperRejectsErrorType = Expect<Equal<Equal<ErrorTypeProbe, number>, false>>;
