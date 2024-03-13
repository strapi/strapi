import type { Common, Utils } from '../..';
import type { ID } from '.';
import type { IsDraftAndPublishEnabled } from './draft-and-publish';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-enigne';

export type ServiceInstance<
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

  // Publication methods are only enabled if D&P is enabled for the content type
  publish: Utils.Expression.If<
    // If draft and publish is enabled for the content type
    IsDraftAndPublishEnabled<TContentTypeUID>,
    // Then, publish method is enabled
    <TParams extends Params.Publish<TContentTypeUID>>(
      documentId: ID,
      params?: TParams
    ) => Result.Publish<TContentTypeUID, TParams>,
    // Otherwise, disable it
    undefined
  >;

  unpublish: Utils.Expression.If<
    IsDraftAndPublishEnabled<TContentTypeUID>,
    <TParams extends Params.Unpublish<TContentTypeUID>>(
      documentId: ID,
      params?: TParams
    ) => Result.Unpublish<TContentTypeUID, TParams>,
    undefined
  >;

  discardDraft: Utils.Expression.If<
    IsDraftAndPublishEnabled<TContentTypeUID>,
    <TParams extends Params.DiscardDraft<TContentTypeUID>>(
      documentId: ID,
      params?: TParams
    ) => Result.DiscardDraft<TContentTypeUID, TParams>,
    undefined
  >;
};
