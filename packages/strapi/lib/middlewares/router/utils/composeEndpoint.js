'use strict';

const _ = require('lodash');
const compose = require('koa-compose');

module.exports = strapi => {
  const routerChecker = require('./routerChecker')(strapi);

  return (value, plugin, router) => {
    if (_.isEmpty(_.get(value, 'method')) || _.isEmpty(_.get(value, 'path'))) {
      return;
    }

    const endpoint = `${value.method} ${value.path}`;

    const { policies, action, validate } = routerChecker(
      value,
      endpoint,
      plugin
    );

    if (_.isUndefined(action) || !_.isFunction(action)) {
      return strapi.log.warn(
        `Ignored attempt to bind route '${endpoint}' to unknown controller/action.`
      );
    }

    router.route(
      _.omitBy(
        {
          method: value.method,
          path: value.path,
          handler: _.remove([compose(policies), action], o => _.isFunction(o)),
          validate,
        },
        _.isEmpty
      )
    );
  };
};
