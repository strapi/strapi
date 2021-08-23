'use strict';

const { unionType } = require('nexus');
const { prop } = require('lodash/fp');

const {
  utils,
  constants: { GENERIC_MORPH_TYPENAME, KINDS },
} = require('../../types');

module.exports = ({ strapi, registry }) => ({
  buildGenericMorphDefinition() {
    return unionType({
      name: GENERIC_MORPH_TYPENAME,

      resolveType(obj) {
        const contentType = strapi.getModel(obj.__type);

        if (!contentType) {
          return null;
        }

        if (contentType.modelType === 'component') {
          return utils.getComponentName(contentType);
        }

        return utils.getTypeName(contentType);
      },

      definition(t) {
        const members = registry
          // Resolve every content-type or component
          .where(({ config }) => [KINDS.type, KINDS.component].includes(config.kind))
          // Only keep their name (the type's id)
          .map(prop('name'));

        t.members(...members);
      },
    });
  },
});
