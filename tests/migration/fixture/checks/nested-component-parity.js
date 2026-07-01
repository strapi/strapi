'use strict';

const { validateNestedComponentRelationParityForUid } = require('../check-impl');

module.exports = {
  id: 'nestedComponentParity',
  title: 'Nested component relation parity',
  async run({ strapi, activeEntries }) {
    const errors = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('nestedComponentParity')) {
        continue;
      }
      const result = await validateNestedComponentRelationParityForUid(
        strapi,
        entry.uid,
        entry.label
      );
      errors.push(...result.errors);
    }

    return { errors, lines: [] };
  },
};
