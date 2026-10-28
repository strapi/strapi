const { validateJoinTableSourceParityForDp } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

type ActiveEntry = { uid: string; checks?: string[] };

module.exports = {
  id: 'joinTableParity',
  title: 'DP join-table source parity',
  async run({ strapi, activeEntries }: { strapi: Strapi; activeEntries: ActiveEntry[] }) {
    const errors: string[] = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('joinTableParity')) {
        continue;
      }
      const result = await validateJoinTableSourceParityForDp(strapi, entry.uid);
      errors.push(...result.errors);
    }

    return { errors, lines: [] as string[] };
  },
};
