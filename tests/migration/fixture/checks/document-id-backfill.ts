const { validateDocumentIdBackfill } = require('../check-impl');

type Strapi = import('@strapi/types').Core.Strapi;

module.exports = {
  id: 'documentIdBackfill',
  title: 'document_id backfill',
  async run({ strapi }: { strapi: Strapi }) {
    return validateDocumentIdBackfill(strapi);
  },
};
