const { validateDraftPublishPairing } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

type ActiveEntry = { uid: string; label: string; i18n?: boolean; checks?: string[] };

module.exports = {
  id: 'draftPublishPair',
  title: 'Draft/publish pairing',
  async run({ strapi, activeEntries }: { strapi: Strapi; activeEntries: ActiveEntry[] }) {
    return validateDraftPublishPairing(strapi, activeEntries);
  },
};
