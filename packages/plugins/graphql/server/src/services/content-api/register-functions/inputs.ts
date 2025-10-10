import type { Core, Struct } from '@strapi/types';
import { type TypeRegistry } from '../../type-registry';

const registerInputsDefinition = (
  contentType: Struct.Schema,
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

  const { getComponentInputName, getContentTypeInputName } = getService('utils').naming;
  const { KINDS } = getService('constants');

  const { modelType } = contentType;

  const type = (modelType === 'component' ? getComponentInputName : getContentTypeInputName).call(
    null,
    contentType
  );

  const definition = builders.buildInputType(contentType);

  registry.register(type, definition, { kind: KINDS.input, contentType });
};

export { registerInputsDefinition };
