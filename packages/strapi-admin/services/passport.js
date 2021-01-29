'use strict';

const passport = require('koa-passport');

const createLocalStrategy = require('./passport/local-strategy');

const getPassportStrategies = () => [createLocalStrategy(strapi)];

const init = () => {
  strapi.admin.services.passport
    .getPassportStrategies()
    .forEach(strategy => passport.use(strategy));

  return passport.initialize();
};

module.exports = {
  init,
  getPassportStrategies,
};
