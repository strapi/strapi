'use strict';

/**
 * Module dependencies
 */

/**
 * Mask filter middleware
 */

const _ = require('lodash');

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      strapi.app.use(async (ctx, next) => {
        // Execute next middleware.
        await next();

        const start = Date.now();

        // Array or plain object
        if (_.isArray(ctx.body) || _.isPlainObject(ctx.body) && ctx.status === 200) {
          // Array.
          if (_.isArray(ctx.body)) {
            ctx.body = ctx.body.map(value => {
              if (_.isPlainObject(value)) {
                console.log(this.mask(ctx, value));
                return this.mask(ctx, value);
              }

              // Raw
              return obj;
            });
          }

          // Plain object.
          ctx.body = this.mask(ctx, ctx.body);
        }
      });

      cb();
    },

    mask: function (ctx, value) {
      const models = this.filteredModels(this.whichModels(value, ctx.request.route.plugin));

      if (models.length === 0) {
        return value;
      }

      const attributesToHide = models.reduce((acc, match) => {
        const attributes = match.plugin ?
          strapi.plugins[match.plugin].models[match.model].attributes:
          strapi.models[match.model].attributes;

        acc = acc.concat(Object.keys(attributes).filter(attr => attributes[attr].private === true));

        return acc;
      }, []);

      // Hide attribute.
      return _.omit(value, attributesToHide);
    },

    whichModels: function (value, plugin) {
      const keys = Object.keys(value);
      let maxMatch = 0;
      let matchs = [];


      const match = (model, plugin) => {
        const attributes = plugin ?
          Object.keys(strapi.plugins[plugin].models[model].attributes):
          Object.keys(strapi.models[model].attributes);

        const intersection = _.intersection(keys, attributes.filter(attr => ['id', '_id', '_v'].indexOf(attr) === -1 )).length;

        // Most matched model.
        if (intersection > maxMatch) {
          maxMatch = intersection;
          matchs = [{
            plugin,
            model,
            intersection
          }];
        } else if (intersection === maxMatch && intersection > 0) {
          matchs.push({
            plugin,
            model,
            intersection
          });
        }
      };

      // Application models.
      Object.keys(strapi.models).forEach(model => match(model));
      // Plugins models.
      Object.keys(strapi.plugins).forEach(plugin => {
        Object.keys(strapi.plugins[plugin].models).forEach(model => match(model, plugin));
      });

      return matchs;
    },

    filteredModels: function (matchs) {
      return matchs.reduce((acc, match, index) => {
        const attributes = match.plugin ?
          strapi.plugins[match.plugin].models[match.model].attributes:
          strapi.models[match.model].attributes;

        // Filtered model which have more than half of the attributes in common
        // with the original model.
        if (match.intersection >= Object.keys(attributes).length / 2) {
          acc[index] = match;
        }

        return acc;
      }, []);
    }
  };
};
