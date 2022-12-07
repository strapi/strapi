import { RegisterArg } from './../../../../types/registerFunctions.d';
import { ContentType } from '../../../../types/schema';

const registerFiltersDefinition = (
  contentType: ContentType,
  { registry, strapi, builders }: RegisterArg
) => {
  const { service: getService } = strapi.plugin('graphql');

  const { getFiltersInputTypeName } = getService('utils').naming;
  const { KINDS } = getService('constants');

  const type = getFiltersInputTypeName(contentType);
  const definition = builders.buildContentTypeFilters(contentType);

  registry.register(type, definition, { kind: KINDS.filtersInput, contentType });
};

export { registerFiltersDefinition };
