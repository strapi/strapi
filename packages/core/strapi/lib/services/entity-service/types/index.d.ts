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
  findPage<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: EntityService.Params.Read<TContentTypeUID>
  ): Promise<{ results: Attribute.GetValues<TContentTypeUID>[]; pagination: Pagination } | null>;
}
