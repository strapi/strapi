'use strict';

const _ = require('lodash');

const { getService } = require('../../utils');

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
        populate: ['id', 'locale', 'published_at'],
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

  strapi.db.migrations.register({
    before() {},
    after() {},
  });
};
