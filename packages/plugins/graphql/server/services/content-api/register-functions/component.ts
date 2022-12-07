import { RegisterArg } from './../../../types/registerFunctions.d';
import { ContentType } from '../../../types/schema';

const registerComponent = (
  contentType: ContentType,
  { registry, strapi, builders }: RegisterArg
) => {
  const { service: getService } = strapi.plugin('graphql');

  const { getComponentName } = getService('utils').naming;
  const { KINDS } = getService('constants');

  const name = getComponentName(contentType);
  const definition = builders.buildTypeDefinition(contentType);

  registry.register(name, definition, { kind: KINDS.component, contentType });
};

export { registerComponent };
