import { RegisterArg } from './../../../../types/registerFunctions.d';
import { ContentType } from '../../../../types/schema';

const registerInputsDefinition = (
  contentType: ContentType,
  { registry, strapi, builders }: RegisterArg
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
