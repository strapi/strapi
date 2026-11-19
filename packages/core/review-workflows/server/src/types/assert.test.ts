// Compile-only assertions shared by this package's type tests. The server tsconfig includes this
// file; declaration builds exclude `*.test.ts`, and the test runners only collect `__tests__`.
export type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;
