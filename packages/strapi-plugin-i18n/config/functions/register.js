'use strict';

const _ = require('lodash');
const pluralize = require('pluralize');
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
