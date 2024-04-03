'use strict';

module.exports = {
  'content-types': {
    // Make sure this is sorted by order to create them
    'api::category.category': require('./category.json'),
    'api::article.article': require('./article.json'),
    'api::author.author': require('./author.json'),
  },
};
