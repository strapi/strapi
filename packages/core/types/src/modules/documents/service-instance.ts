import type { Common, Documents, Schema } from '../..';
import type { ID } from './document-engine';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-enigne';

export type ServiceInstance<TContentType extends Schema.SingleType | Schema.CollectionType> =
  TContentType extends Schema.SingleType
    ? SingleTypeInstance<TContentType['uid']>
    : CollectionTypeInstance<TContentType['uid']>;

export type CollectionTypeInstance<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType
> = {
  findMany: <TParams extends Params.FindMany<TContentTypeUID>>(
    params?: TParams
  ) => Result.FindMany<TContentTypeUID, TParams>;

  findFirst: <TParams extends Params.FindFirst<TContentTypeUID>>(
    params?: TParams
  ) => Result.FindFirst<TContentTypeUID, TParams>;

  findOne: <TParams extends Params.FindOne<TContentTypeUID>>(
    id: ID,
    params?: TParams
  ) => Result.FindOne<TContentTypeUID, TParams>;

  delete: <TParams extends Params.Delete<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ) => Result.Delete;

  create: <TParams extends Params.Create<TContentTypeUID>>(
    params: TParams
  ) => Result.Create<TContentTypeUID, TParams>;

  clone: <TParams extends Params.Clone<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ) => Result.Clone<TContentTypeUID, TParams>;

  update: <TParams extends Params.Update<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ) => Result.Update<TContentTypeUID, TParams>;

  count: <TParams extends Params.Count<TContentTypeUID>>(params?: TParams) => Result.Count;

  publish: <TParams extends Params.Publish<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ) => Result.Publish<TContentTypeUID, TParams>;

  unpublish: <TParams extends Params.Unpublish<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ) => Result.Unpublish<TContentTypeUID, TParams>;

  discardDraft: <TParams extends Params.DiscardDraft<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ) => Result.DiscardDraft<TContentTypeUID, TParams>;
};

export type SingleTypeInstance<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType
> = {
  find: <TParams extends Params.FindOne<TContentTypeUID>>(
    params?: TParams
  ) => Promise<Documents.Result<TContentTypeUID, TParams>>;

  delete: <TParams extends Params.Delete<TContentTypeUID>>(params?: TParams) => Result.Delete;

  update: <TParams extends Params.Update<TContentTypeUID>>(
    params: TParams
  ) => Promise<Documents.Result<TContentTypeUID, TParams>>;

  publish: <TParams extends Params.Publish<TContentTypeUID>>(
    params?: TParams
  ) => Promise<Documents.Result<TContentTypeUID, TParams>>;

  unpublish: <TParams extends Params.Unpublish<TContentTypeUID>>(
    params?: TParams
  ) => Promise<Documents.Result<TContentTypeUID, TParams>>;

  discardDraft: <TParams extends Params.DiscardDraft<TContentTypeUID>>(
    params?: TParams
  ) => Promise<Documents.Result<TContentTypeUID, TParams>>;
};

export type Any = SingleTypeInstance<any> | CollectionTypeInstance<any>;
