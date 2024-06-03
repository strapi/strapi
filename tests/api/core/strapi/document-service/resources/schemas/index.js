'use strict';

module.exports = {
  'content-types': {
    'api::category.category': require('./category'),
    'api::article.article': require('./article'),
    'api::author.author': require('./author'),
  },
  components: {
    'article.comp': require('./comp'),
    'article.dz_comp': require('./dz-comp'),
    'article.dz_other_comp': require('./dz-other-comp'),
    'article.compo_all_unique': require('./comp-all-unique'),
    'article.compo_unique_top_level': require('./comp-unique-top-level'),
  },
};
