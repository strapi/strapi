import OpenIDConnectStrategy from 'passport-openidconnect';
import type { Core } from '@strapi/types';
import { getService } from '../../utils';

const createOpenIdStrategy = (strapi: Core.Strapi, middleware?: any) => {
  return new OpenIDConnectStrategy(
    {
      issuer: `https://${  process.env.AUTH0_DOMAIN  }/`,
      authorizationURL: `https://${  process.env.AUTH0_DOMAIN  }/authorize`,
      tokenURL: `https://${  process.env.AUTH0_DOMAIN  }/oauth/token`,
      userInfoURL: `https://${  process.env.AUTH0_DOMAIN  }/userinfo`,
      clientID: `${process.env.AUTH0_CLIENT_ID}`,
      clientSecret: `${process.env.AUTH0_CLIENT_SECRET}`,
      callbackURL: '/admin/login-openid/redirect',
      scope: [ 'profile', 'email' ]
    },
    (issuer: any, profile: any, done: any) => {
      return getService('auth')
        .checkOpenIdCredentials(profile)
        .then(async ([error, user, message]) => {
          if (middleware) {
            return middleware([error, user, message], done);
          }

          return done(error, user, message);
        })
        .catch((error) => done(error));
    }
  );
};

export default createOpenIdStrategy;
