'use strict';

const { validateRelationParityForDp } = require('../check-impl');

module.exports = {
  id: 'relationApiParity',
  title: 'DP relation parity (API)',
  async run({ strapi, activeEntries }) {
    const errors = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('relationApiParity')) {
        continue;
      }
      const result = await validateRelationParityForDp(strapi, entry.uid);
      errors.push(...result.errors);
    }

    return { errors, lines: [] };
  },
};
