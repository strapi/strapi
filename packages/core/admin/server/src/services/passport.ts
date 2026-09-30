import passport from 'koa-passport';
import type { Strategy } from 'passport-local';
import { isFunction } from 'lodash/fp';

import createLocalStrategy from './passport/local-strategy';
import { getService } from '../utils';

const authEventsMapper = {
  onConnectionSuccess: 'admin.auth.success',
  onConnectionError: 'admin.auth.error',
};

const valueIsFunctionType = ([, value]: [any, any]) => isFunction(value);
const keyIsValidEventName = (
  entry: [string, unknown]
): entry is [keyof typeof authEventsMapper, unknown] => {
  return Object.keys(getService('passport').authEventsMapper).includes(entry[0]);
};

const getPassportStrategies = () => [createLocalStrategy(strapi)] as Strategy[];

const registerAuthEvents = () => {
  // @ts-expect-error - TODO: migrate auth service to TS
  const { events = {} } = strapi.config.get('admin.auth', {});
  const { authEventsMapper } = getService('passport');

  const eventList = Object.entries(events).filter(keyIsValidEventName).filter(valueIsFunctionType);

  for (const [eventName, handler] of eventList) {
    // TODO - TS: ensure the handler is an EventHub.Listener
    strapi.eventHub.on(authEventsMapper[eventName], handler as any);
  }
};

const init = () => {
  getService('passport')
    .getPassportStrategies()
    .forEach((strategy: Strategy) => passport.use(strategy));

  registerAuthEvents();

  return passport.initialize();
};

export default { init, getPassportStrategies, authEventsMapper };
