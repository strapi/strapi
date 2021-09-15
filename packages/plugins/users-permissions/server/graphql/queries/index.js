'use strict';

const me = require('./me');

module.exports = ({ nexus }) => {
  return nexus.extendType({
    type: 'Query',

    definition(t) {
      t.field('me', me({ nexus }));
    },
  });
};
