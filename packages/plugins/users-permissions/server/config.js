'use strict';

module.exports = {
  default: ({ env }) => ({
    jwtSecret: env('JWT_SECRET'),
    jwt: {
      expiresIn: '30d',
    },
    ratelimit: {
      interval: 60000,
      max: 10,
    },
    layout: {
      user: {
        actions: {
          create: 'contentManagerUser.create', // Use the User plugin's controller.
          update: 'contentManagerUser.update',
        },
      },
    },
    callback: {
      validate(callbackURL, provider) {
        const defaultCallbackURL = provider.callback;

        if (callbackURL !== defaultCallbackURL) {
          throw new Error(
            `Forbidden callback provided: ${callbackURL} !== ${defaultCallbackURL})`
          );
        }
      },
    },
  }),
  validator() {},
};
