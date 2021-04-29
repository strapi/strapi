'use strict';

const _ = require('lodash');
const compose = require('koa-compose');
const createRouteChecker = require('./routerChecker');

module.exports = strapi => {
  const routerChecker = createRouteChecker(strapi);

  return (value, { plugin, router }) => {
    if (_.isEmpty(_.get(value, 'method')) || _.isEmpty(_.get(value, 'path'))) {
      return;
    }

    const { method, endpoint, policies, action } = routerChecker(value, plugin);

    if (_.isUndefined(action) || !_.isFunction(action)) {
      return strapi.log.warn(
        `Ignored attempt to bind route '${value.method} ${value.path}' to unknown controller/action.`
      );
    }

    router[method](endpoint, compose(policies), action);
  };
};
