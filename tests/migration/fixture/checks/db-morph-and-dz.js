'use strict';

const { verifyMigrationFixAtDbLevel } = require('../check-impl');

module.exports = {
  id: 'dbMorphAndDz',
  title: 'DB-level verification',
  async run({ strapi }) {
    return verifyMigrationFixAtDbLevel(strapi);
  },
};
