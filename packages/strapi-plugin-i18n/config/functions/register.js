'use strict';

const _ = require('lodash');
const { getService } = require('../../utils');

module.exports = () => {
  Object.values(strapi.contentTypes).forEach(model => {
    if (getService('content-types').isLocalized(model)) {
      _.set(model.attributes, 'localizations', {
        writable: false,
        private: false,
        configurable: false,
        collection: model.modelName,
        populate: ['id', 'locale', 'published_at'],
      });

      _.set(model.attributes, 'locale', {
        writable: false,
        private: false,
        configurable: false,
        type: 'string',
      });

      const writableFields = _.get(model, 'coreApi.writableAttributes', []);
      _.set(model, 'coreApi.writableAttributes', writableFields.concat('locale'));
    }
  });

  strapi.db.migrations.register({
    before() {},
    after() {},
  });
};
