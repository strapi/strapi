import type * as Schema from '../../../schema';
import type * as UID from '../../../uid';

import { Pick } from '.';
import { ID } from '..';
import type * as PublicationStatus from './status';

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
  | 'publicationFilter'
  | 'hasPublishedVersion'
  | 'locale:string'
  | 'lookup'
> & {
  documentId: ID;
  status?: DeleteStatus<TContentTypeUID>;
};

type DraftAndPublishOption<TContentTypeUID extends UID.ContentType> = NonNullable<
  Schema.ContentType<TContentTypeUID>['options']
>['draftAndPublish'];

/**
 * Publication status accepted by `delete`.
 *
 * With draft and publish enabled, deleting the draft version alone throws `Cannot delete a draft
 * document`, so only `published` is accepted. The runtime ignores it: every version is deleted.
 *
 * Any other content type keeps both statuses, including a UID only known at runtime and apps
 * without generated types. Code generic over the UID can pass `published`.
 */
export type DeleteStatus<TContentTypeUID extends UID.ContentType> = [
  DraftAndPublishOption<TContentTypeUID>,
] extends [true]
  ? Extract<PublicationStatus.Kind, 'published'>
  : PublicationStatus.Kind;

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

export type Update<TContentTypeUID extends UID.ContentType> = Pick<
  TContentTypeUID,
  'data:partial' | 'fields' | 'populate' | 'locale:string' | 'lookup'
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
