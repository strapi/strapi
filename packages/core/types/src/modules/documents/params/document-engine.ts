import type * as UID from '../../../uid';
import type { IsStrict } from '../../../core/strictness';

import { Pick, type Kind } from '.';
import { ID } from '..';
import type { CreateInput, UpdateInput } from './write';

/** `TKind` without strict types only: with them, the strict params below replace it. */
type LegacyKind<TKind extends Kind> = IsStrict extends false ? TKind : never;

/** `TKind` with strict types only: without them, the method params stay as on develop. */
type StrictKind<TKind extends Kind> = IsStrict extends false ? never : TKind;

/**
 * `TParams` with strict types only. Without them, `unknown`, which leaves an intersection as on
 * develop.
 */
type StrictParams<TParams> = IsStrict extends false ? unknown : TParams;

/**
 * Document Service specific method params
 *
 * `hasPublishedVersion` on these picks is deprecated in favor of `publicationFilter`.
 */
export type FindMany<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'pagination'
  | 'sort'
  | 'populate'
  | 'status'
  | 'publicationFilter'
  | 'hasPublishedVersion'
  | 'locale'
  | 'plugin'
  | 'lookup'
>;

export type Count<TContentTypeUID extends UID.ContentType> = FindMany<TContentTypeUID>;

export type FindFirst<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'filters'
  | '_q'
  | 'sort'
  | 'populate'
  | 'status'
  | 'publicationFilter'
  | 'hasPublishedVersion'
  | 'locale:string'
  | 'plugin'
  | 'lookup'
>;

export type FindOne<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'fields' | 'populate' | 'filters' | 'status' | 'locale:string' | 'sort' | 'lookup'
> & {
  documentId: ID;
};

export type Delete<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  | 'fields'
  | 'populate'
  | 'filters'
  | 'status'
  | 'publicationFilter'
  | 'hasPublishedVersion'
  | 'locale:string'
  | 'lookup'
> & {
  documentId: ID;
};

/**
 * With strict types, `data` is required (`create` throws without it,
 * `document-service/entries.ts:45-47` in `@strapi/core`) and follows the write rules of the status
 * ({@link CreateInput}): a draft needs fewer keys than a published entry. A `status` that is not a
 * literal must satisfy both, so it takes the published input. Without strict types, develop's params.
 */
export type Create<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  LegacyKind<'data'> | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'
> &
  StrictParams<
    | { status?: 'draft'; data: CreateInput<TContentTypeUID, 'draft'> }
    | { status: 'published'; data: CreateInput<TContentTypeUID, 'published'> }
  >;

/**
 * With strict types, `data` is optional and follows the update rules ({@link UpdateInput}): `clone`
 * merges it over each source entry, so no key is required, then creates a draft from the result
 * (`document-service/repository.ts:473-483` in `@strapi/core`). Without draft and publish, the
 * source entry is published and the copy is a publishing write. Without strict types, develop's
 * params.
 */
export type Clone<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  LegacyKind<'data'> | 'fields' | 'populate' | 'status' | 'locale:string' | 'lookup'
> & {
  documentId: ID;
} & StrictParams<{ data?: UpdateInput<TContentTypeUID, 'draft'> }>;

/**
 * With strict types, `update` also takes `status`, as at runtime. The draft is updated in every case;
 * with draft and publish, `status: 'published'` then publishes it and resolves to the published
 * entry. The core service's `update` always passes it.
 *
 * With strict types, `data` follows the update rules of the status ({@link UpdateInput}): every key
 * is optional, and `null` is accepted where the validator accepts it.
 */
export type Update<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  | LegacyKind<'data:partial'>
  | 'fields'
  | 'populate'
  | 'locale:string'
  | 'lookup'
  | StrictKind<'status'>
> & {
  documentId: ID;
} & StrictParams<
    | { status?: 'draft'; data?: UpdateInput<TContentTypeUID, 'draft'> }
    | { status: 'published'; data?: UpdateInput<TContentTypeUID, 'published'> }
  >;

export type Publish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
> & {
  documentId: ID;
};

export type Unpublish<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale:string' | 'lookup'
> & {
  documentId: ID;
};

export type DiscardDraft<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'filters' | 'locale' | 'lookup'
> & {
  documentId: ID;
};
