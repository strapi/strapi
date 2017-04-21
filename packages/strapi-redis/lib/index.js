'use strict';

/**
 * Module dependencies
 */

// Core
const util = require('util');

// Public node modules.
const _ = require('lodash');
const Redis = require('ioredis');
const stackTrace = require('stack-trace');

/**
 * Redis hook
 */

module.exports = function(strapi) {
  const hook = {
    /**
     * Default options
     */

    defaults: {
      port: 6379,
      host: 'localhost',
      family: 4,
      db: 0,
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      const connections = _.pickBy(strapi.config.connections, {
        connector: 'strapi-redis'
      });

      const done = _.after(_.size(connections), () => {
        cb();
      });

      // For each connection in the config register a new Knex connection.
      _.forEach(connections, (connection, name) => {
        // Apply defaults
        _.defaults(connection.settings, strapi.hooks.redis.defaults);

        try {
          const redis = new Redis(connection.settings);

          redis.on('error', err => {
            strapi.log.error(err);
            process.exit(0);
            return;
          });

          // Utils function.
          // Behavior: Try to retrieve data from Redis, if null
          // execute callback and set the value in Redis for this serial key.
          redis.cache = async ({ expired = 60 * 60, serial }, cb, type) => {
            if (_.isEmpty(serial)) {
              strapi.log.warn(
                `Be careful, you're using cache() function of strapi-redis without serial`
              );

              const traces = stackTrace.get();

              strapi.log.warn(
                `> [${traces[1].getLineNumber()}] ${traces[1]
                  .getFileName()
                  .replace(strapi.config.appPath, '')}`
              );

              return await cb();
            }

            let cache = await redis.get(serial);

            if (!cache) {
              cache = await cb();

              if (
                cache &&
                _.get(connection, 'options.disabledCaching') !== true
              ) {
                redis.set(serial, cache, 'ex', expired);
              }
            }

            switch (type) {
              case 'int':
                return parseInt(cache);
              default:
                return cache;
            }
          };

          // Define as new connection.
          strapi.connections[name] = redis;

          // Expose global
          if (_.get(connection, 'options.global') !== false) {
            global[_.get(connection, 'options.globalName') || 'redis'] = redis;
          }

          if (_.get(connection, 'options.debug') === true) {
            redis.monitor((err, monitor) => {
              // Entering monitoring mode.
              monitor.on('monitor', (time, args) => {
                console.log(time + ': ' + util.inspect(args));
              });
            });
          }

          redis.on('ready', () => {
            done();
          });
        } catch (e) {
          cb(e);

          return false;
        }
      });
    }
  };

  return hook;
};
