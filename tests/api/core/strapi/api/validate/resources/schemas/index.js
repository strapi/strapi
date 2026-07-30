'use strict';

module.exports = {
  'content-types': {
    'api::relation.relation': require('./relation'),
    'api::document.document': require('./document'),
    'api::article.article': require('./article'),
  },
  components: {
    'default.component-nested': require('./component-nested'),
    'default.component-a': require('./component-a'),
    'default.component-b': require('./component-b'),
  },
};
