import type { Core, Struct } from '@strapi/types';

/**
 * @internal Exported so apps can extend it. Not a stable API yet: it may change in a minor release.
 */
export abstract class CoreService<
  TContentType extends Struct.SingleTypeSchema | Struct.CollectionTypeSchema =
    | Struct.SingleTypeSchema
    | Struct.CollectionTypeSchema,
> {
  protected readonly strapi: Core.Strapi;

  protected readonly contentType: TContentType;

  constructor({ strapi, contentType }: { strapi: Core.Strapi; contentType: TContentType }) {
    this.strapi = strapi;
    this.contentType = contentType;
  }

  getFetchParams(params = {}): any {
    return {
      status: 'published',
      ...params,
    };
  }
}
