import { toLower } from 'lodash/fp';
// @ts-expect-error
import { Strategy as LocalStrategy } from 'passport-local';
import type { Strapi } from '@strapi/types';

const createLocalStrategy = (strapi: Strapi, middleware: any) => {
  return new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    (email: any, password: any, done: any) => {
      return (
        // @ts-expect-error
        strapi.admin.services.auth
          .checkCredentials({ email: toLower(email), password })
          // @ts-expect-error
          .then(async ([error, user, message]) => {
            if (middleware) {
              return middleware([error, user, message], done);
            }

            return done(error, user, message);
          })
          // @ts-expect-error
          .catch((error) => done(error))
      );
    }
  );
};

export default createLocalStrategy;
