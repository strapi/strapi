'use strict';

const { unionType } = require('nexus');
const { prop } = require('lodash/fp');

const {
  constants: { GENERIC_MORPH_TYPENAME },
} = require('../../types');

module.exports = ({ registry }) => ({
  buildGenericMorphDefinition() {
    return unionType({
      name: GENERIC_MORPH_TYPENAME,

      resolveType: prop('__typename'),

      definition(t) {
        const members = registry
          .where(({ config }) => ['types', 'components'].includes(config.kind))
          .map(prop('name'));

        t.members(...members);
      },
    });
  },
});
