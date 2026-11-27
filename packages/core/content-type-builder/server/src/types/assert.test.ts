// Compile-only assertions shared by this package's type tests. The server tsconfig includes this
// file; declaration builds exclude `*.test.ts`, and the test runners only collect `__tests__`.
// Operands wrapped in a tuple: TypeScript's error type (an unresolved type, printed as `any`)
// would otherwise make the comparison true for any other operand.
export type Equal<T, U> =
  (<V>() => V extends [T] ? 1 : 2) extends <V>() => V extends [U] ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;
