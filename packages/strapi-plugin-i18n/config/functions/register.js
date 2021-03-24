'use strict';

const _ = require('lodash');
const { PUBLISHED_AT_ATTRIBUTE } = require('strapi-utils').contentTypes.constants;

const { getService } = require('../../utils');
const fieldMigration = require('./migrations/field');
const ctMigration = require('./migrations/content-type');

module.exports = () => {
  const contentTypeService = getService('content-types');
  const coreApiService = getService('core-api');

  Object.values(strapi.contentTypes).forEach(contentType => {
    if (contentTypeService.isLocalized(contentType)) {
      const { attributes, modelName } = contentType;

      _.set(attributes, 'localizations', {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        collection: modelName,
        populate: ['id', 'locale', PUBLISHED_AT_ATTRIBUTE],
      });

      _.set(attributes, 'locale', {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      });

      coreApiService.addCreateLocalizationAction(contentType);
    }
  });

  strapi.db.migrations.register(fieldMigration);
  strapi.db.migrations.register(ctMigration);
};
