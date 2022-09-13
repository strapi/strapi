'use strict';

const getEnabledScalars = require('./get-enabled-scalars');

module.exports = (context) => ({
  getEnabledScalars: getEnabledScalars(context),
});
