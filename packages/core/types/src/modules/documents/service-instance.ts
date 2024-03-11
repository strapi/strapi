import type { Common, Attribute, Schema, EntityService } from '../..';
import type { ID } from '.';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-enigne';

// TODO: move to common place
type ComponentBody = {
  [key: string]: Attribute.GetValue<
    | Attribute.Component<Common.UID.Component, false>
    | Attribute.Component<Common.UID.Component, true>
    | Attribute.DynamicZone
  >;
};

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

  updateComponents: <
    TUID extends Common.UID.Schema,
    TData extends EntityService.Params.Data.Input<TUID>
  >(
    uid: TUID,
    entityToUpdate: {
      id: EntityService.Params.Attribute.ID;
    },
    data: TData
  ) => Promise<ComponentBody>;

  omitComponentData: (
    contentType: Schema.ContentType | Schema.Component,
    data: EntityService.Params.Data.Input<Schema.ContentType['uid'] | Schema.Component['uid']>
  ) => Partial<
    EntityService.Params.Data.Input<Schema.ContentType['uid'] | Schema.Component['uid']>
  >;
};
