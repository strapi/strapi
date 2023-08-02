import type { Attribute, Common, EntityService } from '@strapi/strapi';

// TODO: Move params to @strapi/utils (related to convert-query-params)
export * as Params from './params';

export * from './plugin';

type Pagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};
export interface EntityService {
  findMany<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: EntityService.Params.Pick<
      TContentTypeUID,
      | 'fields'
      | 'filters'
      | 'pagination:offset'
      | 'sort'
      | 'populate'
      | 'publicationState'
      | 'plugin'
    >
  ): Promise<Attribute.GetValues<TContentTypeUID>[]>;
  findOne<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    entityId: number,
    params?: EntityService.Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  ): Promise<Attribute.GetValues<TContentTypeUID> | null>;
  delete<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    entityId: number,
    params?: EntityService.Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  ): Promise<Attribute.GetValues<TContentTypeUID> | null>;
  create<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: EntityService.Params.Pick<TContentTypeUID, 'data' | 'files' | 'fields' | 'populate'>
  ): Promise<Attribute.GetValues<TContentTypeUID>>;
  findPage<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: EntityService.Params.Pick<
      TContentTypeUID,
      'fields' | 'filters' | 'pagination' | 'sort' | 'populate' | 'publicationState' | 'plugin'
    >
  ): Promise<{ results: Attribute.GetValues<TContentTypeUID>[]; pagination: Pagination }>;
}
