import type * as UID from '../../../uid';
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
  TParams extends Params.FindFirst<TContentTypeUID>,
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

export type Clone<
  TContentTypeUID extends UID.ContentType,
  TParams extends Params.Clone<TContentTypeUID>,
> = Promise<{
  documentId: ID;
  entries: Result<TContentTypeUID, TParams>[];
} | null>;

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
