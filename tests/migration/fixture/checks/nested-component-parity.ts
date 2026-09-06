const { validateNestedComponentRelationParityForUid } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

type ActiveEntry = { uid: string; label: string; checks?: string[] };

module.exports = {
  id: 'nestedComponentParity',
  title: 'Nested component relation parity',
  async run({ strapi, activeEntries }: { strapi: Strapi; activeEntries: ActiveEntry[] }) {
    const errors: string[] = [];

    for (const entry of activeEntries) {
      if (!entry.checks?.includes('nestedComponentParity')) {
        continue;
      }
      const result = await validateNestedComponentRelationParityForUid(
        strapi,
        entry.uid,
        entry.label
      );
      errors.push(...result.errors);
    }

    return { errors, lines: [] as string[] };
  },
};
