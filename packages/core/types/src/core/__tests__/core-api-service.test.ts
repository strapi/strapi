import type { CollectionType } from '../core-api/service';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const found: Awaited<ReturnType<CollectionType['find']>>;

// `results` is never `null`.
found.results satisfies unknown[];

// `pagination` keeps the request's notation; `total` comes with `pageCount` when entries are counted.
const { pagination } = found;
if (pagination.page !== undefined) {
  pagination.pageSize satisfies number;
  if (pagination.total !== undefined) {
    pagination.pageCount satisfies number;
  }
  // @ts-expect-error `pageCount` is absent when the service does not count the entries.
  pagination.pageCount satisfies number;
} else {
  pagination.start satisfies number;
  pagination.limit satisfies number;
  // @ts-expect-error `total` is absent when the service does not count the entries.
  pagination.total satisfies number;
}

declare const checks: [
  Expect<
    Equal<
      (typeof found)['results'][number],
      NonNullable<Awaited<ReturnType<CollectionType['findOne']>>>
    >
  >,
];
checks satisfies unknown;
