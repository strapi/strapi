import type { Data, Modules } from '../..';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Without an `Identifiers` entry, the id types stay as they were.
export type Checks = [
  Expect<Equal<Data.ID, string | number>>,
  Expect<Equal<Data.DocumentID, string>>,
  Expect<Equal<Modules.Documents.ID, string>>,
  Expect<Equal<Modules.Documents.Params.Attribute.ID, string | number>>,
  Expect<Equal<Modules.Documents.Params.Attribute.DocumentID, string>>,
];
