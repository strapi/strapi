'use strict';

const { propEq } = require('lodash/fp');
const createSectionBuilder = require('./builder');
const {
  subjectsHandlerFor,
  contentTypesBase,
  fieldsProperty,
  plugins: pluginsHandler,
  settings: settingsHandler,
} = require('./handlers');

const sectionPropMatcher = propEq('section');

const createContentTypesInitialState = () => ({
  actions: [],
  subjects: [],
});

const createDefaultSectionBuilder = () => {
  const builder = createSectionBuilder();

  builder.addSection('plugins', {
    initialStateFactory: () => [],
    handlers: [pluginsHandler],
    matchers: [sectionPropMatcher('plugins')],
  });

  builder.addSection('settings', {
    initialStateFactory: () => [],
    handlers: [settingsHandler],
    matchers: [sectionPropMatcher('settings')],
  });

  builder.addSection('singleTypes', {
    initialStateFactory: createContentTypesInitialState,
    handlers: [contentTypesBase, subjectsHandlerFor('singleType'), fieldsProperty],
    matchers: [sectionPropMatcher('contentTypes')],
  });

  builder.addSection('collectionTypes', {
    initialStateFactory: createContentTypesInitialState,
    handlers: [contentTypesBase, subjectsHandlerFor('collectionType'), fieldsProperty],
    matchers: [sectionPropMatcher('contentTypes')],
  });

  return builder;
};

module.exports = createDefaultSectionBuilder;
