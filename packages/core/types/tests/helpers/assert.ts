/** Shared assertions for the type tests of both programs (strict types on and off). */
export type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
export type Expect<T extends true> = T;
