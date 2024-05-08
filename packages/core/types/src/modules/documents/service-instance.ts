import type { Utils } from '../..';

import type * as UID from '../../uid';

import type { IsDraftAndPublishEnabled } from './draft-and-publish';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-engine';

export type ServiceParams<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  findMany: Params.FindMany<TContentTypeUID>;
  findFirst: Params.FindFirst<TContentTypeUID>;
  findOne: Params.FindOne<TContentTypeUID>;
  delete: Params.Delete<TContentTypeUID>;
  create: Params.Create<TContentTypeUID>;
  clone: Params.Clone<TContentTypeUID>;
  update: Params.Update<TContentTypeUID>;
  count: Params.Count<TContentTypeUID>;
  publish: Params.Publish<TContentTypeUID>;
  unpublish: Params.Unpublish<TContentTypeUID>;
  discardDraft: Params.DiscardDraft<TContentTypeUID>;
};

export type ServiceResults<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  findMany: Result.FindMany<TContentTypeUID, Params.FindMany<TContentTypeUID>>;
  findFirst: Result.FindFirst<TContentTypeUID, Params.FindFirst<TContentTypeUID>>;
  findOne: Result.FindOne<TContentTypeUID, Params.FindOne<TContentTypeUID>>;
  delete: Result.Delete<TContentTypeUID, Params.Delete<TContentTypeUID>>;
  create: Result.Create<TContentTypeUID, Params.Create<TContentTypeUID>>;
  clone: Result.Clone<TContentTypeUID, Params.Clone<TContentTypeUID>>;
  update: Result.Update<TContentTypeUID, Params.Update<TContentTypeUID>>;
  count: Result.Count;
  publish: Result.Publish<TContentTypeUID, Params.Publish<TContentTypeUID>>;
  unpublish: Result.Unpublish<TContentTypeUID, Params.Unpublish<TContentTypeUID>>;
  discardDraft: Result.DiscardDraft<TContentTypeUID, Params.DiscardDraft<TContentTypeUID>>;
};

export type ServiceInstance<
  TContentTypeUID extends UID.ContentType = UID.ContentType,
  TServiceParams extends ServiceParams<TContentTypeUID> = ServiceParams<TContentTypeUID>,
  TServiceResults extends ServiceResults<TContentTypeUID> = ServiceResults<TContentTypeUID>,
> = {
  findMany: (params?: TServiceParams['findMany']) => TServiceResults['findMany'];
  findFirst: (params?: TServiceParams['findFirst']) => TServiceResults['findFirst'];
  findOne: (params: TServiceParams['findOne']) => TServiceResults['findOne'];
  delete: (params: TServiceParams['delete']) => TServiceResults['delete'];
  create: (params: TServiceParams['create']) => TServiceResults['create'];

  /**
   * @internal
   */
  clone: (params: TServiceParams['clone']) => TServiceResults['clone'];
  update: (params: TServiceParams['update']) => TServiceResults['update'];
  count: (params?: TServiceParams['count']) => TServiceResults['count'];

  // Publication methods are only enabled if D&P is enabled for the content type
  publish: Utils.If<
    // If draft and publish is enabled for the content type
    IsDraftAndPublishEnabled<TContentTypeUID>,
    // Then, publish method is enabled
    (params: TServiceParams['publish']) => TServiceResults['publish'],
    // Otherwise, disable it
    never
  >;

  unpublish: Utils.If<
    IsDraftAndPublishEnabled<TContentTypeUID>,
    (params: TServiceParams['unpublish']) => TServiceResults['unpublish'],
    never
  >;

  discardDraft: Utils.If<
    IsDraftAndPublishEnabled<TContentTypeUID>,
    (params: TServiceParams['discardDraft']) => TServiceResults['discardDraft'],
    never
  >;
};
