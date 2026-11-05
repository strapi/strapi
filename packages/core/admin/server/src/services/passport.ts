import passport from 'koa-passport';
import type { Strategy } from 'passport-local';

import createLocalStrategy from './passport/local-strategy';
import { getService } from '../utils';

const authEventsMapper = {
  onConnectionSuccess: 'admin.auth.success',
  onConnectionError: 'admin.auth.error',
};

const valueIsFunctionType = ([, value]: [any, any]) => typeof value === 'function';
const keyIsValidEventName = (
  entry: [string, unknown]
): entry is [keyof typeof authEventsMapper, unknown] => {
  return Object.keys(getService('passport').authEventsMapper).includes(entry[0]);
};

// The published declarations must not name `passport-local`: applications do not install
// `@types/passport-local`, so they already resolve its `Strategy` to `any`, as the EE service
// returns. `any[]` keeps that type and lets the declarations check with `skipLibCheck: false`.
// TODO @Nico a strict strategy contract needs a strategy type that names no third-party module.
const getPassportStrategies = (): any[] => [createLocalStrategy(strapi)];

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
