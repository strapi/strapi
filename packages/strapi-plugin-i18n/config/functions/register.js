'use strict';

const _ = require('lodash');
const { prop } = require('lodash/fp');
const pluralize = require('pluralize');

const isLocalized = model => {
  return prop('pluginOptions.i18n.localized', model) === true;
};

// add a register function to do some stuff after the loading but before the boot
module.exports = () => {
  
  // need to add some logic to the db layer so we can add fields to the models
  Object.values(strapi.models).forEach(model => {
    if (isLocalized(model)) {
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

      // add new route
      const route =
        model.kind === 'singleType'
          ? _.kebabCase(model.modelName)
          : _.kebabCase(pluralize(model.modelName));

      const localizationRoutes = [
        {
          method: 'POST',
          path: `/${route}/:id/localizations`,
          handler: `${model.modelName}.createLocalization`,
          config: {
            policies: [],
          },
        },
      ];

      const handler = function(ctx) {
        ctx.body = 'works';
      };

      strapi.config.routes.push(...localizationRoutes);

      _.set(
        strapi,
        `api.${model.apiName}.controllers.${model.modelName}.createLocalization`,
        handler
      );
    }
  });

  strapi.db.migrations.register({
    before() {},
    after() {},
  });
};
