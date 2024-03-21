import type { UID, Utils } from '../..';
import type { ID } from '.';
import type { IsDraftAndPublishEnabled } from './draft-and-publish';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-engine';

export type ServiceInstance<TContentTypeUID extends UID.ContentType = UID.ContentType> =
  Utils.Intersect<
    [
      // Base methods (findMany, create, update, etc...)
      BaseServiceInstance,
      // Publication methods are only enabled if D&P is enabled for the content type
      Utils.If<IsDraftAndPublishEnabled<TContentTypeUID>, DraftAndPublishMethods, unknown>
    ]
  >;

type BaseServiceInstance<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  findMany<TParams extends Params.FindMany<TContentTypeUID>>(
    params?: TParams
  ): Result.FindMany<TContentTypeUID, TParams>;

  findFirst<TParams extends Params.FindFirst<TContentTypeUID>>(
    params?: TParams
  ): Result.FindFirst<TContentTypeUID, TParams>;

  findOne<TParams extends Params.FindOne<TContentTypeUID>>(
    id: ID,
    params?: TParams
  ): Result.FindOne<TContentTypeUID, TParams>;

  delete<TParams extends Params.Delete<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ): Result.Delete;

  create<TParams extends Params.Create<TContentTypeUID>>(
    params: TParams
  ): Result.Create<TContentTypeUID, TParams>;

  /**
   * @internal
   * Exposed for use within the Strapi Admin Panel
   */
  clone<TParams extends Params.Clone<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ): Result.Clone<TContentTypeUID, TParams>;

  update<TParams extends Params.Update<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ): Result.Update<TContentTypeUID, TParams>;

  count<TParams extends Params.Count<TContentTypeUID>>(params?: TParams): Result.Count;
};

type DraftAndPublishMethods<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  publish<TParams extends Params.Publish<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ): Result.Publish<TContentTypeUID, TParams>;

  unpublish<TParams extends Params.Unpublish<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ): Result.Unpublish<TContentTypeUID, TParams>;

  discardDraft<TParams extends Params.DiscardDraft<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ): Result.DiscardDraft<TContentTypeUID, TParams>;
};
