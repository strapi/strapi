import type { Attribute, Common, EntityService } from '@strapi/strapi';

// TODO: Move params to @strapi/utils (related to convert-query-params)
export * as Params from './params';

export * from './plugin';

export interface EntityService {
  findMany<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: EntityService.Params.Pick<
      TContentTypeUID,
      'fields' | 'filters' | 'pagination:offset' | 'sort' | 'populate' | 'publicationState'
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
}
