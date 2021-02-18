'use strict';

const draftAndPublish = require('./draft-publish');

module.exports = () => {
  strapi.db.migrations.register(draftAndPublish);
};
