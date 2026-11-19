/** Shared assertions for the strict-off program. */
export type { Equal, Expect } from '../helpers/assert';
/** Suggested names widen a type for completion without changing which values it accepts. */
export type SameValues<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
