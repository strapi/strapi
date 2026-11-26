'use strict';

const ARTICLE_UID = 'api::load-pages-article.load-pages-article';

module.exports = {
  actions: {
    loadPages({ strapi }, { entity, field, params }) {
      return strapi.db.query(ARTICLE_UID).loadPages(entity, field, params);
    },
  },
};
