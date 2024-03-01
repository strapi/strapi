import type * as UID from '../../uid';
import type * as Documents from '../documents';

import type { ID } from './document-engine';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-engine';

export type ServiceInstance<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
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

export type SingleTypeInstance<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
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
