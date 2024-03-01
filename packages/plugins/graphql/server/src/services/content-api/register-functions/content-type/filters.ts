import type { Core, Internal } from '@strapi/types';
import type { TypeRegistry } from '../../../type-registry';

const registerFiltersDefinition = (
  contentType: Internal.Struct.Schema,
  {
    registry,
    strapi,
    builders,
  }: {
    registry: TypeRegistry;
    strapi: Core.Strapi;
    builders: any;
  }
) => {
  const { service: getService } = strapi.plugin('graphql');

  const { getFiltersInputTypeName } = getService('utils').naming;
  const { KINDS } = getService('constants');

  const type = getFiltersInputTypeName(contentType);
  const definition = builders.buildContentTypeFilters(contentType);

  registry.register(type, definition, { kind: KINDS.filtersInput, contentType });
};

export { registerFiltersDefinition };
