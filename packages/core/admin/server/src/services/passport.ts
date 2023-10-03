// @ts-expect-error
import passport from 'koa-passport';
import { isFunction } from 'lodash/fp';

import createLocalStrategy from './passport/local-strategy';

const authEventsMapper = {
  onConnectionSuccess: 'admin.auth.success',
  onConnectionError: 'admin.auth.error',
};

const valueIsFunctionType = ([, value]: any) => isFunction(value);
const keyIsValidEventName = ([key]: any) => {
  return Object.keys(strapi.admin.services.passport.authEventsMapper).includes(key);
};

const getPassportStrategies = () => [createLocalStrategy(strapi)];

const registerAuthEvents = () => {
  const { events = {} } = strapi.config.get('admin.auth', {}) as any;
  const { authEventsMapper } = strapi.admin.services.passport;

  const eventList = Object.entries(events)
    .filter(keyIsValidEventName)
    .filter(valueIsFunctionType) as any;

  for (const [eventName, handler] of eventList) {
    strapi.eventHub.on(authEventsMapper[eventName], handler);
  }
};

const init = () => {
  strapi.admin.services.passport
    .getPassportStrategies()
    .forEach((strategy: any) => passport.use(strategy));

  registerAuthEvents();

  return passport.initialize();
};

export { init, getPassportStrategies, authEventsMapper };
