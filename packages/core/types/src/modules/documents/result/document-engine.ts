import type * as UID from '../../../uid';
import type { IsStrict } from '../../../core/strictness';
import type * as Params from '../params/document-engine';
import type { Pick as ParamsPick } from '../params';

import type { PublicationStatus, Result, StrictResult } from '.';
import type { ID } from '..';

export type CountResult = { count: number };

/**
 * The entries a method returns. Without strict types, develop's {@link Result}. With strict types,
 * the strict result model ({@link StrictResult}), whose `publishedAt` follows `TDefaultStatus` when
 * the params have no `status`.
 */
type Entry<
  TContentTypeUID extends UID.ContentType,
  TParams extends ParamsPick<TContentTypeUID, 'fields' | 'populate'>,
  TDefaultStatus extends PublicationStatus,
> = IsStrict extends false
  ? Result<TContentTypeUID, TParams>
  : StrictResult<TContentTypeUID, TParams, TDefaultStatus>;

/**
 * The entries of a method whose status is fixed by the method itself, whatever the params: `publish`
 * and `unpublish` return published entries, `discardDraft` drafts, and `delete` both versions.
 */
type FixedStatusEntry<
  TContentTypeUID extends UID.ContentType,
  TParams extends ParamsPick<TContentTypeUID, 'fields' | 'populate'>,
  TStatus extends PublicationStatus,
> = IsStrict extends false
  ? Result<TContentTypeUID, TParams>
  : StrictResult<TContentTypeUID, Omit<TParams, 'status'>, TStatus>;

/** Document Service reads default to drafts (`status: 'draft'`). */
export type FindMany<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindMany<TContentTypeUID>,
> = Promise<Entry<TContentTypeUID, TParams, 'draft'>[]>;

export type FindFirst<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindFirst<TContentTypeUID>,
> = Promise<Entry<TContentTypeUID, TParams, 'draft'> | null>;

export type FindOne<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindOne<TContentTypeUID>,
> = Promise<Entry<TContentTypeUID, TParams, 'draft'> | null>;

/** `delete` removes every version of the document: its entries may be drafts or published. */
export type Delete<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindMany<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  entries: FixedStatusEntry<TContentTypeUID, TParams, PublicationStatus>[];
}>;

/**
 * `create` returns the draft, or the published entry with `status: 'published'` on a draft and
 * publish content type.
 */
export type Create<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Create<TContentTypeUID>,
> = Promise<Entry<TContentTypeUID, TParams, 'draft'>>;

/**
 * The result of `clone`. With strict types, it is never `null`: the service always resolves to the
 * new document ID and the cloned entries. When nothing matches the source document, `entries` is
 * empty and `documentId` is `undefined` (the ID is read from the first cloned entry). Without strict
 * types, develop's type.
 */
export type Clone<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Clone<TContentTypeUID>,
> = Promise<
  IsStrict extends false
    ? {
        documentId: ID;
        entries: Result<TContentTypeUID, TParams>[];
      } | null
    : {
        documentId: ID | undefined;
        entries: Entry<TContentTypeUID, TParams, 'draft'>[];
      }
>;

/**
 * `update` returns the updated draft, or the published entry with `status: 'published'` on a draft
 * and publish content type. `null` when the document does not exist.
 */
export type Update<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Update<TContentTypeUID>,
> = Promise<Entry<TContentTypeUID, TParams, 'draft'> | null>;

export type Count = Promise<number>;

export type Publish<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Publish<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  entries: FixedStatusEntry<TContentTypeUID, TParams, 'published'>[];
}>;

export type Unpublish<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Unpublish<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  /** The published versions that were removed. */
  entries: FixedStatusEntry<TContentTypeUID, TParams, 'published'>[];
}>;

export type DiscardDraft<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.DiscardDraft<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  /** The drafts recreated from the published versions. */
  entries: FixedStatusEntry<TContentTypeUID, TParams, 'draft'>[];
}>;
