'use strict';

const me = require('./me');

module.exports = ({ builder }) => {
  return builder.queryField('me', (t) => t.field(me({ builder })));
};
