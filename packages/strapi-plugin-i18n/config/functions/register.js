'use strict';

const _ = require('lodash');
const { getService } = require('../../utils');

module.exports = () => {
  Object.values(strapi.contentTypes).forEach(model => {
    if (getService('content-types').isLocalized(model)) {
      _.set(model.attributes, 'localizations', {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        collection: model.modelName,
        populate: ['id', 'locale', 'published_at'],
      });

      _.set(model.attributes, 'locale', {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      });
    }
  });

  strapi.db.migrations.register({
    before() {},
    after() {},
  });
};
