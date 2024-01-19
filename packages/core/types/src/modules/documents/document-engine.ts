import type { Common } from '../../types';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-enigne';

export type ID = string;

export type UploadFile = (
  uid: Common.UID.Schema,
  entity: Record<string, unknown>,
  files: Record<string, unknown>
) => Promise<void>;

export interface DocumentEngine {
  uploadFiles: UploadFile;

  findMany<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.FindMany<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Result.FindMany<TContentTypeUID, TParams>;

  findFirst<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.FindFirst<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Result.FindFirst<TContentTypeUID, TParams>;

  findOne<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.FindOne<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.FindOne<TContentTypeUID, TParams>;

  delete<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Delete<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Delete<TContentTypeUID, TParams>;

  deleteMany<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.DeleteMany<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Result.DeleteMany;

  create<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Create<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params: TParams
  ): Result.Create<TContentTypeUID, TParams>;

  clone<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Clone<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Clone<TContentTypeUID, TParams>;

  update<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Update<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Update<TContentTypeUID, TParams>;

  count<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Count<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Result.Count;

  publish<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Publish<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Publish<TContentTypeUID, TParams>;

  unpublish<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Unpublish<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.Unpublish<TContentTypeUID, TParams>;

  discardDraft<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.DiscardDraft<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Result.DiscardDraft<TContentTypeUID, TParams>;
}
