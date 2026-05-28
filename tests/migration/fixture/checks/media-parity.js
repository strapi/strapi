'use strict';

const { validateMediaParityForDp } = require('../check-impl');

module.exports = {
  id: 'mediaParity',
  title: 'Media parity (draft vs published)',
  async run({ strapi, activeEntries }) {
    const errors = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('mediaParity')) {
        continue;
      }
      const result = await validateMediaParityForDp(strapi, entry.uid);
      errors.push(...result.errors);
    }

    return { errors, lines: [] };
  },
};
