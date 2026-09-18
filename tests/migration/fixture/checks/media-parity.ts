const { validateMediaParityForDp } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

type ActiveEntry = { uid: string; checks?: string[] };

module.exports = {
  id: 'mediaParity',
  title: 'Media parity (draft vs published)',
  async run({ strapi, activeEntries }: { strapi: Strapi; activeEntries: ActiveEntry[] }) {
    const errors: string[] = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('mediaParity')) {
        continue;
      }
      const result = await validateMediaParityForDp(strapi, entry.uid);
      errors.push(...result.errors);
    }

    return { errors, lines: [] as string[] };
  },
};
