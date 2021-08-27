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

  builder.createSection('plugins', {
    initialStateFactory: () => [],
    handlers: [pluginsHandler],
    matchers: [sectionPropMatcher('plugins')],
  });

  builder.createSection('settings', {
    initialStateFactory: () => [],
    handlers: [settingsHandler],
    matchers: [sectionPropMatcher('settings')],
  });

  builder.createSection('singleTypes', {
    initialStateFactory: createContentTypesInitialState,
    handlers: [contentTypesBase, subjectsHandlerFor('singleType'), fieldsProperty],
    matchers: [sectionPropMatcher('contentTypes')],
  });

  builder.createSection('collectionTypes', {
    initialStateFactory: createContentTypesInitialState,
    handlers: [contentTypesBase, subjectsHandlerFor('collectionType'), fieldsProperty],
    matchers: [sectionPropMatcher('contentTypes')],
  });

  return builder;
};

module.exports = createDefaultSectionBuilder;
