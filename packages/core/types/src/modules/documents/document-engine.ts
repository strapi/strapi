import type * as UID from '../../uid';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-engine';

export type ID = string;

export interface DocumentEngine {
  findMany<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.FindMany<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Result.FindMany<TContentTypeUID, TParams>;

  findFirst<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.FindFirst<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Result.FindFirst<TContentTypeUID, TParams>;

  findOne<TContentTypeUID extends UID.ContentType, TParams extends Params.FindOne<TContentTypeUID>>(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.FindOne<TContentTypeUID, TParams>;

  delete<TContentTypeUID extends UID.ContentType, TParams extends Params.Delete<TContentTypeUID>>(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Delete;

  create<TContentTypeUID extends UID.ContentType, TParams extends Params.Create<TContentTypeUID>>(
    uid: TContentTypeUID,
    params: TParams
  ): Result.Create<TContentTypeUID, TParams>;

  clone<TContentTypeUID extends UID.ContentType, TParams extends Params.Clone<TContentTypeUID>>(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Clone<TContentTypeUID, TParams>;

  update<TContentTypeUID extends UID.ContentType, TParams extends Params.Update<TContentTypeUID>>(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Update<TContentTypeUID, TParams>;

  count<TContentTypeUID extends UID.ContentType, TParams extends Params.Count<TContentTypeUID>>(
    uid: TContentTypeUID,
    params?: TParams
  ): Result.Count;

  publish<TContentTypeUID extends UID.ContentType, TParams extends Params.Publish<TContentTypeUID>>(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Publish<TContentTypeUID, TParams>;

  unpublish<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Unpublish<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Unpublish<TContentTypeUID, TParams>;

  discardDraft<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.DiscardDraft<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.DiscardDraft<TContentTypeUID, TParams>;

  // Entry utilities
  deleteEntry<TContentTypeUID extends UID.ContentType>(
    uid: TContentTypeUID,
    entryId: number | string
  ): Promise<void>;
}
