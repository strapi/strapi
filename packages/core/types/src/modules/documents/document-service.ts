import type { Common, Utils } from '../../types';
import type { Result } from './result';
import type * as Params from './params';

export type CountResult = { count: number };

export type ID = string;

export type UploadFile = (
  uid: Common.UID.Schema,
  entity: Record<string, unknown>,
  files: Record<string, unknown>
) => Promise<void>;

export interface DocumentService {
  uploadFiles: UploadFile;

  // TODO: Split in 2 different signatures for both single types & collection types
  findMany<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.FindMany<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<
    Utils.Expression.MatchFirst<
      [
        [Common.UID.IsCollectionType<TContentTypeUID>, Result<TContentTypeUID, TParams>[]],
        // Is this true for documents?
        [Common.UID.IsSingleType<TContentTypeUID>, Result<TContentTypeUID, TParams> | null]
      ],
      (Result<TContentTypeUID, TParams> | null) | Result<TContentTypeUID, TParams>[]
    >
  >;

  findFirst<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.FindFirst<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  findOne<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.FindOne<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  delete<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Delete<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  deleteMany<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.DeleteMany<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<CountResult | null>;

  // TODO: Make data param required
  create<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Create<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params: TParams
  ): Promise<Result<TContentTypeUID, TParams>>;

  clone<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Clone<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams>>;

  update<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Update<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  count<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Count<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<number | null>;

  publish<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Publish<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Promise<number | null>;

  unpublish<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Unpublish<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    documentId: ID,
    params?: TParams
  ): Promise<number | null>;
}
