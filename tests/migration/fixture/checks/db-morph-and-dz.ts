const { verifyMigrationFixAtDbLevel } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

module.exports = {
  id: 'dbMorphAndDz',
  title: 'DB-level verification',
  async run({ strapi }: { strapi: Strapi }) {
    return verifyMigrationFixAtDbLevel(strapi);
  },
};
