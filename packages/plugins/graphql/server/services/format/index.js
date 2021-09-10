'use strict';

const returnTypes = require('./return-types');

module.exports = context => ({
  returnTypes: returnTypes(context),
});
