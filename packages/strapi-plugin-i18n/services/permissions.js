'use strict';

const i18nActionsService = require('./permissions/actions');
const i18nConditionsService = require('./permissions/conditions');
const sectionsBuilderService = require('./permissions/sections-builder');
const engineService = require('./permissions/engine');

module.exports = {
  actions: i18nActionsService,
  conditions: i18nConditionsService,
  sectionsBuilder: sectionsBuilderService,
  engine: engineService,
};
