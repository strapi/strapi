'use strict';

const { validateDocumentIdBackfill } = require('../check-impl');

module.exports = {
  id: 'documentIdBackfill',
  title: 'document_id backfill',
  async run({ strapi }) {
    return validateDocumentIdBackfill(strapi);
  },
};
