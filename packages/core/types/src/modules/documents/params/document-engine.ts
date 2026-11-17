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
 * Publication status accepted by `delete`, read from the content type's `draftAndPublish` option.
 *
 * - Enabled: `published` only. Deleting the draft version alone throws `Cannot delete a draft document`.
 *   `published` is accepted for compatibility but ignored: every version of the document is deleted.
 * - Disabled: none, the document has no publication status.
 * - Unknown (no generated types, a UID only known at runtime, or no `options` in the schema): any status.
 *
 * Code generic over the UID cannot pass a status, since the option is unknown until the UID is.
 */
export type DeleteStatus<TContentTypeUID extends UID.ContentType> = [
  DraftAndPublishOption<TContentTypeUID>
] extends [true]
  ? Extract<PublicationStatus.Kind, 'published'>
  : true extends DraftAndPublishOption<TContentTypeUID>
  ? PublicationStatus.Kind
  : never;

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
