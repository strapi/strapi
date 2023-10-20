'use strict';

module.exports = {
  'content-types': {
    'api::category.category': require('./category'),
    'api::article.article': require('./article'),
  },
  components: {
    'article.comp': require('./comp'),
    'article.dz_comp': require('./dz-comp'),
    'article.dz_other_comp': require('./dz-other-comp'),
  },
};
