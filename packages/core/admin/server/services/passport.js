'use strict';

const passport = require('koa-passport');
const { isFunction } = require('lodash/fp');

const createLocalStrategy = require('./passport/local-strategy');

const authEventsMapper = {
  onConnectionSuccess: 'admin.auth.success',
  onConnectionError: 'admin.auth.error',
};

const valueIsFunctionType = ([, value]) => isFunction(value);
const keyIsValidEventName = ([key]) => {
  return Object.keys(strapi.admin.services.passport.authEventsMapper).includes(key);
};

const getPassportStrategies = () => [createLocalStrategy(strapi)];

const registerAuthEvents = () => {
  const { events = {} } = strapi.config.get('admin.auth', {});
  const { authEventsMapper } = strapi.admin.services.passport;

  const eventList = Object.entries(events)
    .filter(keyIsValidEventName)
    .filter(valueIsFunctionType);

  for (const [eventName, handler] of eventList) {
    strapi.eventHub.on(authEventsMapper[eventName], handler);
  }
};

const init = () => {
  strapi.admin.services.passport
    .getPassportStrategies()
    .forEach(strategy => passport.use(strategy));

  registerAuthEvents();

  return passport.initialize();
};

module.exports = {
  init,
  getPassportStrategies,
  authEventsMapper,
};
