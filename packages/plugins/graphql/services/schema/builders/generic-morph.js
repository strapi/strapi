'use strict';

const { unionType } = require('nexus');
const { prop } = require('lodash/fp');

const {
  utils,
  constants: { GENERIC_MORPH_TYPENAME },
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
          .where(({ config }) => ['types', 'components'].includes(config.kind))
          .map(prop('name'));

        t.members(...members);
      },
    });
  },
});
