'use strict';

const { objectType } = require('nexus');

const Pagination = objectType({
  name: 'Pagination',

  definition(t) {
    t.nonNull.field('total', {
      type: 'Int',

      resolve(/*root, args*/) {
        // const { uid } = root;

        // return strapi.query(uid).count(args);
        return 0;
      },
    });

    t.nonNull.field('page', {
      type: 'Int',

      resolve() {
        return 0;
      },
    });

    t.nonNull.field('pageSize', {
      type: 'Int',

      resolve() {
        return 0;
      },
    });

    t.nonNull.field('pageCount', {
      type: 'Int',

      resolve() {
        return 0;
      },
    });
  },
});

module.exports = Pagination;
