'use strict';

const registerComponent = (contentType, { registry, strapi, builders }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { getComponentName } = getService('utils').naming;
  const { KINDS } = getService('constants');

  const name = getComponentName(contentType);
  const definition = builders.buildTypeDefinition(contentType);

  registry.register(name, definition, { kind: KINDS.component, contentType });
};

module.exports = { registerComponent };
