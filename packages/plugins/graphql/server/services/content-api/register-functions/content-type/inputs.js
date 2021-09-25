'use strict';

const registerInputsDefinition = (contentType, { registry, strapi, builders }) => {
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

module.exports = { registerInputsDefinition };
