import type { Utils, Schema } from '../..';
import type * as EntityService from '../entity-service';

import type * as AttributeUtils from './params/attributes';
import type * as UID from '../../uid';

import type { ID } from '.';
import type { IsDraftAndPublishEnabled } from './draft-and-publish';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-engine';

// TODO: move to common place
type ComponentBody = {
  [key: string]: AttributeUtils.GetValue<
    | Schema.Attribute.Component<UID.Component, false>
    | Schema.Attribute.Component<UID.Component, true>
    | Schema.Attribute.DynamicZone
  >;
};

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

  /**
   * @internal
   * Exposed for use within the Strapi Admin Panel
   */
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
  publish: Utils.If<
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

  unpublish: Utils.If<
    IsDraftAndPublishEnabled<TContentTypeUID>,
    <TParams extends Params.Unpublish<TContentTypeUID>>(
      documentId: ID,
      params?: TParams
    ) => Result.Unpublish<TContentTypeUID, TParams>,
    undefined
  >;

  discardDraft: Utils.If<
    IsDraftAndPublishEnabled<TContentTypeUID>,
    <TParams extends Params.DiscardDraft<TContentTypeUID>>(
      documentId: ID,
      params?: TParams
    ) => Result.DiscardDraft<TContentTypeUID, TParams>,
    undefined
  >;

  /**
   * @internal
   * Exposed for use within document service middlewares
   */
  updateComponents: (
    entityToUpdate: {
      id: EntityService.Params.Attribute.ID;
    },
    data: EntityService.Params.Data.Input<UID.Schema>
  ) => Promise<ComponentBody>;

  /**
   * @internal
   * Exposed for use within document service middlewares
   */
  omitComponentData: (
    data: EntityService.Params.Data.Input<Schema.ContentType['uid']>
  ) => Partial<EntityService.Params.Data.Input<Schema.ContentType['uid']>>;
};
