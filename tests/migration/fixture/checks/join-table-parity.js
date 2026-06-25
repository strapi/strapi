'use strict';

const { validateJoinTableSourceParityForDp } = require('../check-impl');

module.exports = {
  id: 'joinTableParity',
  title: 'DP join-table source parity',
  async run({ strapi, activeEntries }) {
    const errors = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('joinTableParity')) {
        continue;
      }
      const result = await validateJoinTableSourceParityForDp(strapi, entry.uid);
      errors.push(...result.errors);
    }

    return { errors, lines: [] };
  },
};
