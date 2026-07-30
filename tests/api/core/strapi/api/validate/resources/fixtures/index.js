'use strict';

module.exports = {
  'content-types': {
    'api::relation.relation': require('./relation'),
    'api::document.document': require('./document'),
    'api::article.article': require('./article'),
  },
};
