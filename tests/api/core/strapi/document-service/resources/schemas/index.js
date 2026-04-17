'use strict';

module.exports = {
  'content-types': {
    'api::category.category': require('./category'),
    'api::article.article': require('./article'),
    'api::author.author': require('./author'),
    'api::mixed-content.mixed-content': require('./mixed-content'),
  },
  components: {
    'article.comp': require('./comp'),
    'article.dz_comp': require('./dz-comp'),
    'article.dz_other_comp': require('./dz-other-comp'),
    'article.compo_unique_all': require('./compo-unique-all'),
    'article.compo_unique_top_level': require('./compo-unique-top-level'),
    'mixed-content.mixed-content-nested-media-leaf': require('./mixed-content-nested-media-leaf'),
    'mixed-content.mixed-content-nested-media-wrapper': require('./mixed-content-nested-media-wrapper'),
  },
};
