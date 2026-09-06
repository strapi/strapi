const { validateRelationParityForDp } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

type ActiveEntry = { uid: string; checks?: string[] };

module.exports = {
  id: 'relationApiParity',
  title: 'DP relation parity (API)',
  async run({ strapi, activeEntries }: { strapi: Strapi; activeEntries: ActiveEntry[] }) {
    const errors: string[] = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('relationApiParity')) {
        continue;
      }
      const result = await validateRelationParityForDp(strapi, entry.uid);
      errors.push(...result.errors);
    }

    return { errors, lines: [] as string[] };
  },
};
