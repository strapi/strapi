'use strict';

module.exports = {
  'content-types': {
    // Make sure this is sorted by order to create them
    'api::category.category': require('./category'),
    'api::article.article': require('./article'),
    'api::author.author': require('./author'),
  },
};
