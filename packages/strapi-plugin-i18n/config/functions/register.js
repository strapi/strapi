'use strict';

const _ = require('lodash');
const { getService } = require('../../utils');

module.exports = () => {
  Object.values(strapi.models).forEach(model => {
    if (getService('content-types').isLocalized(model)) {
      _.set(model.attributes, 'localizations', {
        writable: true,
        private: false,
        configurable: false,
        type: 'json',
      });

      _.set(model.attributes, 'locale', {
        writable: true,
        private: false,
        configurable: false,
        type: 'string',
      });
    }
  });

  strapi.db.migrations.register({
    before() {},
    after() {},
  });
};
