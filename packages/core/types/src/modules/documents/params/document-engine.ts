import type * as UID from '../../../uid';
import type { IsStrict } from '../../../core/strictness';

import { Pick, type Kind } from '.';
import { ID } from '..';

/** `TKind` with strict types only: without them, the method params stay as on develop. */
type StrictKind<TKind extends Kind> = IsStrict extends false ? never : TKind;

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

export type Create<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'
>;

export type Clone<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data' | 'fields' | 'populate' | 'status' | 'locale:string' | 'lookup'
> & {
  documentId: ID;
};

/**
 * With strict types, `update` also takes `status`, as at runtime. The draft is updated in every case;
 * with draft and publish, `status: 'published'` then publishes it and resolves to the published
 * entry. The core service's `update` always passes it.
 */
export type Update<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data:partial' | 'fields' | 'populate' | 'locale:string' | 'lookup' | StrictKind<'status'>
> & {
  documentId: ID;
};

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
