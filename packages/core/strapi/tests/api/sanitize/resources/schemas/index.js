'use strict';

module.exports = {
  'content-types': {
    'api::relation.relation': require('./relation'),
    'api::document.document': require('./document'),
  },
  components: {
    'default.component-a': require('./component-a'),
    'default.component-b': require('./component-b'),
  },
};
