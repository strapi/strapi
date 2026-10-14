import type * as UID from '../../../uid';
import type { IsStrict } from '../../../core/strictness';
import type * as Params from '../params/document-engine';

import type { Result } from '.';
import type { ID } from '..';

export type CountResult = { count: number };

export type FindMany<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindMany<TContentTypeUID>,
> = Promise<Result<TContentTypeUID, TParams>[]>;

export type FindFirst<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindFirst<TContentTypeUID>,
> = Promise<Result<TContentTypeUID, TParams> | null>;

export type FindOne<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindOne<TContentTypeUID>,
> = Promise<Result<TContentTypeUID, TParams> | null>;

export type Delete<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.FindMany<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  entries: Result<TContentTypeUID, TParams>[];
}>;

export type Create<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Create<TContentTypeUID>,
> = Promise<Result<TContentTypeUID, TParams>>;

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
        entries: Result<TContentTypeUID, TParams>[];
      }
>;

export type Update<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Update<TContentTypeUID>,
> = Promise<Result<TContentTypeUID, TParams> | null>;

export type Count = Promise<number>;

export type Publish<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Publish<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  entries: Result<TContentTypeUID, TParams>[];
}>;

export type Unpublish<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Unpublish<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  entries: Result<TContentTypeUID, TParams>[];
}>;

export type DiscardDraft<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.DiscardDraft<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  entries: Result<TContentTypeUID, TParams>[];
}>;
