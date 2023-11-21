import { Common, Utils } from '../../..';
import { Result } from '.';
import * as Params from '../params/document-service';

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
  documents: Result<TContentTypeUID, TParams>[];
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
  id: string;
  documents: Result<TContentTypeUID, TParams>[];
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
  documents: Result<TContentTypeUID, TParams>[];
}>;

export type Unpublish<
  TContentTypeUID extends Common.UID.ContentType,
  TParams extends Params.Unpublish<TContentTypeUID>
> = Promise<{
  documents: Result<TContentTypeUID, TParams>[];
}>;
