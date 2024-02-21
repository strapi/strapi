import { Common, Utils } from '../../..';
import { Result } from '.';
import * as Params from '../params/document-engine';

export type CountResult = { count: number };

export type FindMany<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.FindMany<TContentTypeUID>
> = Promise<
  Utils.Expression.MatchFirst<
    [
      [Common.UID.IsCollectionType<TContentTypeUID>, Result<TContentTypeUID, TParams>[]],
      // Is this true for documents?
      [Common.UID.IsSingleType<TContentTypeUID>, Result<TContentTypeUID, TParams> | null]
    ],
    (Result<TContentTypeUID, TParams> | null) | Result<TContentTypeUID, TParams>[]
  >
>;

export type FindFirst<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.FindFirst<TContentTypeUID>
> = Promise<Result<TContentTypeUID, TParams> | null>;

export type FindOne<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.FindFirst<TContentTypeUID>
> = Promise<Result<TContentTypeUID, TParams> | null>;

export type Delete<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.Delete<TContentTypeUID>
> = Promise<{
  versions: Result<TContentTypeUID, TParams>[];
} | null>;

export type DeleteMany = Promise<CountResult | null>;

export type Create<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.Create<TContentTypeUID>
> = Promise<Result<TContentTypeUID, TParams>>;

export type Clone<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.Clone<TContentTypeUID>
> = Promise<{
  documentId: string;
  versions: Result<TContentTypeUID, TParams>[];
} | null>;

export type Update<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.Update<TContentTypeUID>
> = Promise<Result<TContentTypeUID, TParams> | null>;

export type Count = Promise<number | null>;

export type Publish<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.Publish<TContentTypeUID>
> = Promise<{
  versions: Result<TContentTypeUID, TParams>[];
}>;

export type Unpublish<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.Unpublish<TContentTypeUID>
> = Promise<{
  versions: Result<TContentTypeUID, TParams>[];
}>;

export type DiscardDraft<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.DiscardDraft<TContentTypeUID>
> = Promise<{
  versions: Result<TContentTypeUID, TParams>[];
}>;
