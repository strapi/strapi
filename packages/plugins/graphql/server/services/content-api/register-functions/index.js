'use strict';

const { registerCollectionType } = require('./collection-type');
const { registerSingleType } = require('./single-type');
const { registerComponent } = require('./component');
const { registerPolymorphicContentType } = require('./polymorphic');

const { registerScalars } = require('./scalars');
const { registerInternals } = require('./internals');

const contentType = require('./content-type');

module.exports = {
  registerCollectionType,
  registerSingleType,
  registerComponent,
  registerPolymorphicContentType,
  registerInternals,
  registerScalars,

  contentType,
};
