'use strict';

const { validateEntityGraph } = require('../check-impl');

module.exports = {
  id: 'entityGraph',
  title: 'Components/dynamic zones/media',
  async run({ strapi }) {
    return validateEntityGraph(strapi);
  },
};
