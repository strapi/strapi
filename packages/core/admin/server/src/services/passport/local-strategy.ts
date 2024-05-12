import { toLower } from 'lodash/fp';
import { Strategy as LocalStrategy } from 'passport-local';
import type { Strapi } from '@strapi/types';
import { getService } from '../../utils';

const createLocalStrategy = (strapi: Strapi, middleware?: any) => {
  return new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    (email: string, password: string, done: any) => {
      return getService('auth')
        .checkCredentials({ email: toLower(email), password })
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

export default createLocalStrategy;
