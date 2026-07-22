'use strict';

const { validateRelationsPresence } = require('../check-impl');

module.exports = {
  id: 'relationTargets',
  title: 'Relation targets',
  async run({ strapi, activeEntries }) {
    return validateRelationsPresence(strapi, activeEntries);
  },
};
