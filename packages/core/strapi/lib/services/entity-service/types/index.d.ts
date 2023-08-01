import type { Attribute, Common, EntityService } from '@strapi/strapi';

// TODO: Move params to @strapi/utils (related to convert-query-params)
export * as Params from './params';

export * from './plugin';

export interface EntityService {
  findMany<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: Omit<
      EntityService.Params.Read<TContentTypeUID>,
      keyof EntityService.Params.Pagination.PageNotation
    >
  ): Promise<Attribute.GetValues<TContentTypeUID>[]>;
}
