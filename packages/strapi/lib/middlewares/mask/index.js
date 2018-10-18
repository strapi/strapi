'use strict';

/**
 * Module dependencies
 */

/**
 * Mask filter middleware
 */

const _ = require('lodash');
/* eslint-disable no-unused-vars */
module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      // Enable the middleware if we need it.
      const enabled = (() => {
        const main = Object.keys(strapi.models).reduce((acc, current) => {
          if (Object.values(strapi.models[current].attributes).find(attr => attr.private === true)) {
            acc = true;
          }

          return acc;
        }, false);

        const plugins = Object.keys(strapi.plugins).reduce((acc, plugin) => {
          const bool = Object.keys(strapi.plugins[plugin].models).reduce((acc, model) => {
            if (Object.values(strapi.plugins[plugin].models[model].attributes).find(attr => attr.private === true)) {
              acc = true;
            }

            return acc;
          }, false);

          if (bool) {
            acc = true;
          }

          return acc;
        }, false);

        return main || plugins;
      })();

      if (enabled) {
        strapi.app.use(async (ctx, next) => {
          // Execute next middleware.
          await next();

          // Recursive to mask the private properties.
          const mask = (payload) => {
            // Handle ORM toJSON() method to work on real JSON object.
            payload = payload && payload.toJSON ? payload.toJSON() : payload;

            if (_.isArray(payload)) {
              return payload.map(mask);
            } else if (_.isPlainObject(payload)) {
              return this.mask(
                ctx,
                Object.keys(payload).reduce((acc, current) => {
                  acc[current] = _.isObjectLike(payload[current]) ? mask(payload[current]) : payload[current];

                  return acc;
                }, {})
              );
            }

            return payload;
          };

          // Only pick successful JSON requests.
          if ([200, 201, 202].includes(ctx.status) && ctx.type === 'application/json' && !ctx.request.admin) {
            ctx.body = mask(ctx.body);
          }
        });
      }

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

        // Filtered model which have more than 50% of the attributes
        // in common with the original model.
        if (match.intersection >= Object.keys(attributes).length / 2) {
          acc[index] = match;
        }

        return acc;
      }, []);
    }
  };
};
