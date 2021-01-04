'use strict';

const _ = require('lodash');

// add a register function to do some stuff after the loading but before the boot
module.exports = () => {
  // need to add some logic to the db layer so we can add fields to the models

  Object.values(strapi.models).forEach(model => {
    if (_.get(model, 'pluginOptions.i18n.enabled', false) === true) {
      // find a way to specify the id to use in the relations or compo relations
      // model.relationalId = 'strapi_id';
      // model.attributes.compo.relationalId = 'strapi_id';

      _.set(model.attributes, 'strapi_id', {
        writable: true,
        private: false,
        configurable: false,
        type: 'string',
      });

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
        default: 'en-US',
      });
    }
  });

  // strapi.database.migrations.push({
  //   before() {},
  //   after() {},
  // });
};
