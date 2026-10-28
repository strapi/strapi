const { validateRelationsPresence } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

type ActiveEntry = { uid: string };

module.exports = {
  id: 'relationTargets',
  title: 'Relation targets',
  async run({ strapi, activeEntries }: { strapi: Strapi; activeEntries: ActiveEntry[] }) {
    return validateRelationsPresence(strapi, activeEntries);
  },
};
