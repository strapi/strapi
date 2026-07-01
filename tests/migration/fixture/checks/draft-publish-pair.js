'use strict';

const { validateDraftPublishPairing } = require('../check-impl');

module.exports = {
  id: 'draftPublishPair',
  title: 'Draft/publish pairing',
  async run({ strapi, activeEntries }) {
    return validateDraftPublishPairing(strapi, activeEntries);
  },
};
