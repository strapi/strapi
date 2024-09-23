import { errors } from '@strapi/utils';
import createLocalStrategy from '../../../../server/src/services/passport/local-strategy';
import sso from './passport/sso';
import { isSsoLocked } from '../utils/sso-lock';

const { UnauthorizedError } = errors;

const localStrategyMiddleware = async ([error, user, message]: any, done: any) => {
  // if we got a user, we need to check that it's not sso locked
  if (user && !error && (await isSsoLocked(user))) {
    return done(
      new UnauthorizedError('Login not allowed, please contact your administrator', {
        code: 'LOGIN_NOT_ALLOWED',
      }),
      user,
      message
    );
  }

  return done(error, user, message);
};

const getPassportStrategies = () => {
  if (!strapi.ee.features.isEnabled('sso')) {
    return [createLocalStrategy(strapi)];
  }

  const localStrategy = createLocalStrategy(strapi, localStrategyMiddleware);

  if (!strapi.isLoaded) {
    sso.syncProviderRegistryWithConfig();
  }

  // TODO
  // @ts-expect-error check map types
  const providers = sso.providerRegistry.getAll();
  const strategies = providers.map((provider: any) => provider.createStrategy(strapi));

  return [localStrategy, ...strategies];
};

export default {
  getPassportStrategies,
  ...sso,
};
